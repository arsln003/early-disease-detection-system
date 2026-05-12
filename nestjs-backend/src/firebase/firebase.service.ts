// import { Injectable, OnModuleInit } from '@nestjs/common';
// import * as admin from 'firebase-admin';
// import * as path from 'path';

// @Injectable()
// export class FirebaseService implements OnModuleInit {
//   onModuleInit() {
//     if (!admin.apps.length) {
//       admin.initializeApp({
//         credential: admin.credential.cert(
//           path.join(process.cwd(), 'firebase-service-account.json'),
//         ),
//       });
//     }
//   }

//   async sendReportToDoctor(payload: {
//     fcmToken: string | null;
//   doctorName: string;
//   patientId: number;
//   patientName: string;
//   modelName: string;
//   comment?: string;
//   reportId: number;  
//   }): Promise<void> {
//      if (!payload.fcmToken?.trim()) return;
//     const message: admin.messaging.Message = {
//       token: payload.fcmToken,
//       notification: {
//        title: `🩺 High-Risk Alert: ${payload.patientName}`,
//   body: `🚨 Urgent: High-risk factors detected in ${payload.patientName}'s report. Immediate follow-up advised.`,
//       },
//       data: {
//         patientId: String(payload.patientId),
//       patientName: payload.patientName,
//       doctorName: payload.doctorName,
//       modelName: payload.modelName,
//       comment: payload.comment ?? '',
//       reportId: String(payload.reportId), 
//       type: 'REPORT_PREDICTED',
//       },
//     };

//     await admin.messaging().send(message);
//   }
// }

import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as path from 'path';

@Injectable()
export class FirebaseService implements OnModuleInit {
  onModuleInit() {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(
          path.join(process.cwd(), 'firebase-service-account.json'),
        ),
      });
    }
  }

  async sendReportToDoctor(payload: {
    fcmToken: string | null;
    doctorName: string;
    patientId: number;
    patientName: string;
    modelName: string;
    comment?: string;
    reportId: number;  
  }): Promise<void> {
     if (!payload.fcmToken?.trim()) return;
     
    const message: admin.messaging.Message = {
      token: payload.fcmToken,
      // 🔥 FIX: 'notification' block hata diya gaya hai.
      // Ab yeh "Data-Only" payload ban gaya hai, jisay Service Worker 100% catch karega.
      data: {
        title: `🩺 High-Risk Alert: ${payload.patientName}`,
        body: `🚨 Urgent: High-risk factors detected in ${payload.patientName}'s report. Immediate follow-up advised.`,
        patientId: String(payload.patientId),
        patientName: payload.patientName,
        doctorName: payload.doctorName,
        modelName: payload.modelName,
        comment: payload.comment ?? '',
        reportId: String(payload.reportId), 
        type: 'REPORT_PREDICTED',
      },
    };

    await admin.messaging().send(message);
  }
}