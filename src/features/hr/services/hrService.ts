import { collection, query, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Employee, Attendance, LeaveRequest, Payroll } from '../models/hr';
import { db, auth } from '../../../core/firebase/firebaseConfig';
import { offlineDB } from '../../../core/offline/db';

class HrService {
  private initialized = false;

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await offlineDB.initializeTalkOSDatabase({ syncToCloud: false });
      this.initialized = true;
    }
  }

  async getEmployees(): Promise<Employee[]> {
    await this.ensureInitialized();
    const local = await offlineDB.getCollection<Employee>('hr_employees');
    if (db && auth?.currentUser) {
      try {
        const snapshot = await getDocs(query(collection(db, 'hr_employees')));
        if (!snapshot.empty) {
          const merged = new Map<string, Employee>();
          for (const e of local) merged.set(e.id, e);
          for (const d of snapshot.docs) {
            merged.set(d.id, { id: d.id, ...d.data() } as Employee);
          }
          const list = Array.from(merged.values());
          await offlineDB.replaceCollectionLocal('hr_employees', list);
          return list;
        }
      } catch {
        // Offline fallback
      }
    }
    return local;
  }

  async getAttendance(): Promise<Attendance[]> {
    await this.ensureInitialized();
    const local = await offlineDB.getCollection<Attendance>('hr_attendance');
    if (db && auth?.currentUser) {
      try {
        const snapshot = await getDocs(query(collection(db, 'hr_attendance')));
        if (!snapshot.empty) {
          const remote = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Attendance));
          await offlineDB.replaceCollectionLocal('hr_attendance', remote);
          return remote;
        }
      } catch {
        // Offline fallback
      }
    }
    return local;
  }

  async recordAttendance(data: Omit<Attendance, 'id'>): Promise<Attendance> {
    await this.ensureInitialized();
    const newAttendance: Attendance = {
      ...data,
      id: `att_${Date.now()}`
    };
    await offlineDB.setDoc('hr_attendance', newAttendance.id, newAttendance);
    return newAttendance;
  }

  async getLeaveRequests(): Promise<LeaveRequest[]> {
    await this.ensureInitialized();
    const local = await offlineDB.getCollection<LeaveRequest>('hr_leaves');
    if (db && auth?.currentUser) {
      try {
        const snapshot = await getDocs(query(collection(db, 'hr_leaves')));
        if (!snapshot.empty) {
          const remote = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LeaveRequest));
          await offlineDB.replaceCollectionLocal('hr_leaves', remote);
          return remote;
        }
      } catch {
        // Offline fallback
      }
    }
    return local;
  }

  async getPayroll(): Promise<Payroll[]> {
    await this.ensureInitialized();
    const local = await offlineDB.getCollection<Payroll>('hr_payroll');
    if (db && auth?.currentUser) {
      try {
        const snapshot = await getDocs(query(collection(db, 'hr_payroll')));
        if (!snapshot.empty) {
          const remote = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Payroll));
          await offlineDB.replaceCollectionLocal('hr_payroll', remote);
          return remote;
        }
      } catch {
        // Offline fallback
      }
    }
    return local;
  }

  async addEmployee(employeeData: Omit<Employee, 'id'>): Promise<Employee> {
    await this.ensureInitialized();
    const newEmployee: Employee = {
      ...employeeData,
      id: `emp_${Date.now()}`
    };
    await offlineDB.setDoc('hr_employees', newEmployee.id, newEmployee);
    if (db && auth?.currentUser) {
      try {
        await setDoc(doc(db, 'hr_employees', newEmployee.id), newEmployee);
      } catch {
        // Queued via offlineDB
      }
    }
    return newEmployee;
  }

  async updateEmployee(id: string, data: Partial<Employee>): Promise<void> {
    await this.ensureInitialized();
    await offlineDB.updateDoc<Employee>('hr_employees', id, data);
    if (db && auth?.currentUser) {
      try {
        await updateDoc(doc(db, 'hr_employees', id), data);
      } catch {
        // Queued via offlineDB
      }
    }
  }

  async deleteEmployee(id: string): Promise<void> {
    await this.ensureInitialized();
    await offlineDB.deleteDoc('hr_employees', id);
    if (db && auth?.currentUser) {
      try {
        await deleteDoc(doc(db, 'hr_employees', id));
      } catch {
        // Queued via offlineDB
      }
    }
  }
}

export const hrService = new HrService();
