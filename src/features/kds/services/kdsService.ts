import { collection, query, where, onSnapshot, doc, updateDoc, getDocs, setDoc, deleteDoc, runTransaction } from 'firebase/firestore';
import { Ticket, Station, TicketItemStatus, OrderStatus, TicketItem } from '../models/kds';
import { db, auth } from '../../../core/firebase/firebaseConfig';
import { offlineDB, DEFAULT_KDS_STATIONS } from '../../../core/offline/db';
import { transitionTicketItem } from './ticketTransitions';

const ACTIVE_STATUSES: OrderStatus[] = ['NEW', 'ACCEPTED', 'PREPARING', 'READY'];
const ticketSubscribers = new Set<(tickets: Ticket[]) => void>();

async function broadcastLocalTickets() {
  const all = await offlineDB.getCollection<Ticket>('tickets');
  const active = all
    .filter(t => ACTIVE_STATUSES.includes(t.status))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  ticketSubscribers.forEach(cb => {
    try {
      cb(active);
    } catch {
      // ignore subscriber error
    }
  });
}

class KdsService {
  private initialized = false;

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await offlineDB.initializeTalkOSDatabase({ syncToCloud: false });
      this.initialized = true;
    }
  }

  async getStations(): Promise<Station[]> {
    await this.ensureInitialized();
    const local = await offlineDB.getCollection<Station>('stations');
    if (db) {
      try {
        const q = query(collection(db, 'stations'));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const remote = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Station));
          await offlineDB.replaceCollectionLocal('stations', remote);
          return remote;
        }
      } catch {
        // Fallback to local
      }
    }
    return local.length > 0 ? local : DEFAULT_KDS_STATIONS;
  }

  async getTickets(): Promise<Ticket[]> {
    await this.ensureInitialized();
    const local = await offlineDB.getCollection<Ticket>('tickets');
    return local.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  subscribeToTickets(stationId: string | null, callback: (tickets: Ticket[]) => void, onError: (error: Error) => void): () => void {
    const filteredCallback = (tickets: Ticket[]) => {
      if (!stationId) {
        callback(tickets);
      } else {
        callback(tickets.filter(t => t.items?.some(i => i.stationId === stationId) || true));
      }
    };

    ticketSubscribers.add(filteredCallback);

    // 1. Immediately load from persistent local storage
    this.ensureInitialized()
      .then(() => broadcastLocalTickets())
      .catch(err => onError(err instanceof Error ? err : new Error(String(err))));

    // 2. Sync with backend API for any webhook or kiosk tickets
    fetch('/api/kds/tickets')
      .then(res => res.json())
      .then(async data => {
        if (data.tickets && Array.isArray(data.tickets) && data.tickets.length > 0) {
          for (const t of data.tickets) {
            if (t && t.id) {
              await offlineDB.setDoc('tickets', t.id, t, { syncToCloud: false });
            }
          }
          await broadcastLocalTickets();
        }
      })
      .catch(() => {});

    // 3. Attach Firestore real-time listener when online & authenticated
    let unsubscribeFirestore = () => {};
    if (db && auth?.currentUser) {
      try {
        const ticketsRef = collection(db, 'tickets');
        const q = query(ticketsRef, where('status', 'in', ACTIVE_STATUSES));
        unsubscribeFirestore = onSnapshot(
          q,
          async snapshot => {
            for (const d of snapshot.docs) {
              const remoteTicket = { id: d.id, ...d.data() } as Ticket;
              await offlineDB.setDoc('tickets', remoteTicket.id, remoteTicket, { syncToCloud: false });
            }
            await broadcastLocalTickets();
          },
          () => {
            // Keep serving offline tickets even if Firestore listener fails
            broadcastLocalTickets().catch(() => {});
          }
        );
      } catch {
        // Offline fallback
      }
    }

    return () => {
      ticketSubscribers.delete(filteredCallback);
      unsubscribeFirestore();
    };
  }

  async updateTicketStatus(ticketId: string, status: OrderStatus): Promise<void> {
    await this.ensureInitialized();
    const now = new Date().toISOString();
    const updates: Partial<Ticket> = {
      status,
      ...(status === 'ACCEPTED' ? { acceptedAt: now } : {}),
      ...(status === 'READY' ? { completedAt: now } : {})
    };
    await offlineDB.updateDoc<Ticket>('tickets', ticketId, updates);
    await broadcastLocalTickets();

    if (db && auth?.currentUser) {
      try {
        await updateDoc(doc(db, 'tickets', ticketId), updates);
      } catch {
        // Synced via offlineDB outbox
      }
    }
  }

  async updateItemStatus(ticketId: string, itemId: string, status: TicketItemStatus, _items: TicketItem[]): Promise<void> {
    await this.ensureInitialized();
    const localTicket = await offlineDB.getDoc<Ticket>('tickets', ticketId);
    const now = new Date().toISOString();

    if (localTicket) {
      const { items: updatedItems, allReady, reopened } = transitionTicketItem(localTicket, itemId, status, now);
      const updates: Partial<Ticket> = {
        items: updatedItems,
        ...(allReady ? { status: 'READY', completedAt: now } : {}),
        ...(reopened ? { status: 'PREPARING', completedAt: undefined } : {})
      };
      await offlineDB.updateDoc<Ticket>('tickets', ticketId, updates);
      await broadcastLocalTickets();
    }

    if (db && auth?.currentUser) {
      try {
        const ticketRef = doc(db, 'tickets', ticketId);
        await runTransaction(db, async transaction => {
          const snapshot = await transaction.get(ticketRef);
          if (!snapshot.exists()) return;
          const ticket = snapshot.data() as Ticket;
          const { items: updatedItems, allReady, reopened } = transitionTicketItem(ticket, itemId, status, now);
          transaction.update(ticketRef, {
            items: updatedItems,
            ...(allReady ? { status: 'READY', completedAt: now } : {}),
            ...(reopened ? { status: 'PREPARING', completedAt: null } : {})
          });
        });
      } catch {
        // Synced via offlineDB outbox
      }
    }
  }

  async createTicket(ticketData: Omit<Ticket, 'id' | 'createdAt'>): Promise<Ticket> {
    await this.ensureInitialized();
    // Deterministic ID makes retries for the same paid order idempotent
    const id = `t_${ticketData.orderId}`;
    const existingLocal = await offlineDB.getDoc<Ticket>('tickets', id);
    if (existingLocal) {
      return existingLocal;
    }

    const newTicket: Ticket = {
      ...ticketData,
      id,
      createdAt: new Date().toISOString()
    };
    const cleanTicket = JSON.parse(JSON.stringify(newTicket)) as Ticket;

    await offlineDB.setDoc('tickets', id, cleanTicket);
    await broadcastLocalTickets();

    if (db && auth?.currentUser) {
      try {
        await setDoc(doc(db, 'tickets', id), cleanTicket);
      } catch {
        // Synced via offlineDB outbox
      }
    }

    return cleanTicket;
  }

  async addStation(stationData: Omit<Station, 'id'>): Promise<Station> {
    await this.ensureInitialized();
    const newStation: Station = {
      ...stationData,
      id: `st_${Date.now()}`
    };
    await offlineDB.setDoc('stations', newStation.id, newStation);
    if (db && auth?.currentUser) {
      try {
        await setDoc(doc(db, 'stations', newStation.id), newStation);
      } catch {
        // Queued
      }
    }
    return newStation;
  }

  async updateStation(id: string, data: Partial<Station>): Promise<void> {
    await this.ensureInitialized();
    await offlineDB.updateDoc<Station>('stations', id, data);
    if (db && auth?.currentUser) {
      try {
        await updateDoc(doc(db, 'stations', id), data);
      } catch {
        // Queued
      }
    }
  }

  async deleteStation(id: string): Promise<void> {
    await this.ensureInitialized();
    await offlineDB.deleteDoc('stations', id);
    if (db && auth?.currentUser) {
      try {
        await deleteDoc(doc(db, 'stations', id));
      } catch {
        // Queued
      }
    }
  }
}

export const kdsService = new KdsService();
