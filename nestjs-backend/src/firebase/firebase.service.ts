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
    fcmToken: string| null;
    doctorName: string;
    patientName: string;
    reportId: number;
    radiologistName: string;
    comment?: string;
  }): Promise<void> {
     if (!payload.fcmToken?.trim()) return;
    const message: admin.messaging.Message = {
      token: payload.fcmToken,
      notification: {
       title: '🩻 New Report & Prediction Ready',
  body: `Report and AI prediction for ${payload.patientName} are ready.`,
      },
      data: {
        reportId: String(payload.reportId),
        patientName: payload.patientName,
        radiologistName: payload.radiologistName,
        comment: payload.comment ?? '',
        type: 'REPORT_PREDICTED',
      },
    };

    await admin.messaging().send(message);
  }
}