import { collection, query, getDocs, doc, setDoc, updateDoc, onSnapshot, where } from 'firebase/firestore';
import { db, auth } from '../../../core/firebase/firebaseConfig';
import { offlineDB, DEFAULT_FLOORS, DEFAULT_TABLES } from '../../../core/offline/db';
import { Floor, Table, Reservation, WaitlistEntry } from '../models/table';

const tableSubscribers = new Set<(tables: Table[]) => void>();
const reservationSubscribers = new Map<string, Set<(reservations: Reservation[]) => void>>();

async function broadcastTables() {
  const tables = await offlineDB.getCollection<Table>('table_items');
  tableSubscribers.forEach(cb => {
    try {
      cb(tables);
    } catch {
      // ignore
    }
  });
}

async function broadcastReservations(dateStr: string) {
  const all = await offlineDB.getCollection<Reservation>('table_reservations');
  const filtered = all.filter(r => r.date === dateStr);
  const subs = reservationSubscribers.get(dateStr);
  if (subs) {
    subs.forEach(cb => {
      try {
        cb(filtered);
      } catch {
        // ignore
      }
    });
  }
}

class TableService {
  private initialized = false;

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await offlineDB.initializeTalkOSDatabase({ syncToCloud: false });
      this.initialized = true;
    }
  }

  async getFloors(): Promise<Floor[]> {
    await this.ensureInitialized();
    const local = await offlineDB.getCollection<Floor>('table_floors');
    if (db) {
      try {
        const snapshot = await getDocs(query(collection(db, 'table_floors')));
        if (!snapshot.empty) {
          const remote = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Floor)).sort((a, b) => a.order - b.order);
          await offlineDB.replaceCollectionLocal('table_floors', remote);
          return remote;
        }
      } catch {
        // Offline fallback
      }
    }
    return (local.length > 0 ? local : DEFAULT_FLOORS).sort((a, b) => a.order - b.order);
  }

  async getTables(): Promise<Table[]> {
    await this.ensureInitialized();
    const local = await offlineDB.getCollection<Table>('table_items');
    if (db) {
      try {
        const snapshot = await getDocs(query(collection(db, 'table_items')));
        if (!snapshot.empty) {
          const remote = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Table));
          await offlineDB.replaceCollectionLocal('table_items', remote);
          return remote;
        }
      } catch {
        // Offline fallback
      }
    }
    return local.length > 0 ? local : DEFAULT_TABLES;
  }

  async getReservations(dateStr: string): Promise<Reservation[]> {
    await this.ensureInitialized();
    const local = await offlineDB.getCollection<Reservation>('table_reservations');
    if (db && auth?.currentUser) {
      try {
        const q = query(collection(db, 'table_reservations'), where('date', '==', dateStr));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          for (const d of snapshot.docs) {
            await offlineDB.setDoc('table_reservations', d.id, { id: d.id, ...d.data() } as Reservation, { syncToCloud: false });
          }
        }
      } catch {
        // Offline fallback
      }
    }
    const all = await offlineDB.getCollection<Reservation>('table_reservations');
    return all.filter(r => r.date === dateStr);
  }

  async getWaitlist(): Promise<WaitlistEntry[]> {
    await this.ensureInitialized();
    const local = await offlineDB.getCollection<WaitlistEntry>('table_waitlist');
    return local.filter(w => w.status === 'WAITING');
  }

  subscribeToTables(callback: (tables: Table[]) => void) {
    tableSubscribers.add(callback);
    this.getTables().then(callback).catch(() => {});

    let unsubFirestore = () => {};
    if (db) {
      try {
        const q = query(collection(db, 'table_items'));
        unsubFirestore = onSnapshot(
          q,
          async snapshot => {
            if (!snapshot.empty) {
              const remote = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Table));
              await offlineDB.replaceCollectionLocal('table_items', remote);
              callback(remote);
            }
          },
          () => {}
        );
      } catch {
        // Offline fallback
      }
    }

    return () => {
      tableSubscribers.delete(callback);
      unsubFirestore();
    };
  }

  subscribeToReservations(dateStr: string, callback: (reservations: Reservation[]) => void) {
    if (!reservationSubscribers.has(dateStr)) {
      reservationSubscribers.set(dateStr, new Set());
    }
    reservationSubscribers.get(dateStr)!.add(callback);
    this.getReservations(dateStr).then(callback).catch(() => {});

    let unsubFirestore = () => {};
    if (db && auth?.currentUser) {
      try {
        const q = query(collection(db, 'table_reservations'), where('date', '==', dateStr));
        unsubFirestore = onSnapshot(
          q,
          async snapshot => {
            for (const d of snapshot.docs) {
              await offlineDB.setDoc('table_reservations', d.id, { id: d.id, ...d.data() } as Reservation, { syncToCloud: false });
            }
            await broadcastReservations(dateStr);
          },
          () => {}
        );
      } catch {
        // Offline fallback
      }
    }

    return () => {
      reservationSubscribers.get(dateStr)?.delete(callback);
      unsubFirestore();
    };
  }

  async updateTable(id: string, data: Partial<Table>): Promise<void> {
    await this.ensureInitialized();
    await offlineDB.updateDoc<Table>('table_items', id, data);
    await broadcastTables();
    if (db && auth?.currentUser) {
      try {
        await updateDoc(doc(db, 'table_items', id), data);
      } catch {
        // Queued via offlineDB
      }
    }
  }

  async addTable(data: Omit<Table, 'id'>): Promise<Table> {
    await this.ensureInitialized();
    const newTable: Table = {
      ...data,
      id: `tbl_${Date.now()}`
    };
    await offlineDB.setDoc('table_items', newTable.id, newTable);
    await broadcastTables();
    if (db && auth?.currentUser) {
      try {
        await setDoc(doc(db, 'table_items', newTable.id), newTable);
      } catch {
        // Queued via offlineDB
      }
    }
    return newTable;
  }

  async addReservation(data: Omit<Reservation, 'id' | 'createdAt'>): Promise<Reservation> {
    await this.ensureInitialized();
    const newReservation: Reservation = {
      ...data,
      id: `res_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    await offlineDB.setDoc('table_reservations', newReservation.id, newReservation);
    await broadcastReservations(newReservation.date);
    if (db) {
      try {
        await setDoc(doc(db, 'table_reservations', newReservation.id), newReservation);
      } catch {
        // Queued via offlineDB
      }
    }
    return newReservation;
  }

  async addFloor(data: Omit<Floor, 'id'>): Promise<Floor> {
    await this.ensureInitialized();
    const newFloor: Floor = {
      ...data,
      id: `flr_${Date.now()}`
    };
    await offlineDB.setDoc('table_floors', newFloor.id, newFloor);
    if (db && auth?.currentUser) {
      try {
        await setDoc(doc(db, 'table_floors', newFloor.id), newFloor);
      } catch {
        // Queued via offlineDB
      }
    }
    return newFloor;
  }
}

export const tableService = new TableService();
