import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../shared/components/ui/Card';
import { CheckCircle2 } from 'lucide-react';

export function TaskCenterWidget() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-slate-500" />
          Task Center
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-500">No pending operational tasks assigned.</p>
      </CardContent>
    </Card>
  );
}
