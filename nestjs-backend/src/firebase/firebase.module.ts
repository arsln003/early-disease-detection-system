import { Module } from '@nestjs/common';
import { FirebaseService } from './firebase.service';

@Module({
  providers: [FirebaseService],
  exports: [FirebaseService],   // ← so other modules can use it
})
export class FirebaseModule {}