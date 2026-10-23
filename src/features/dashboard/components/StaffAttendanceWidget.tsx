import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../shared/components/ui/Card';
import { Users } from 'lucide-react';
import { hrService } from '../../hr/services/hrService';
import { Employee } from '../../hr/models/hr';

export function StaffAttendanceWidget() {
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    hrService.getEmployees().then(setEmployees).catch(() => setEmployees([]));
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="w-5 h-5 text-slate-500" />
          Shift Status
        </CardTitle>
        <span className="text-sm font-medium text-slate-500">
          {employees.length} Registered
        </span>
      </CardHeader>
      <CardContent>
        {employees.length === 0 ? (
          <p className="text-sm text-slate-500">No shift attendance recorded yet today.</p>
        ) : (
          <div className="space-y-3">
            {employees.slice(0, 5).map((employee) => (
              <div key={employee.id} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white leading-none">
                    {employee.firstName} {employee.lastName}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{employee.designation}</p>
                </div>
                <span className="text-xs font-medium text-emerald-600">{employee.status}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
