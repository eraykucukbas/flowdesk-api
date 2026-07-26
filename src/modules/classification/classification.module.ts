import { Module } from '@nestjs/common';
import { ClassificationService } from './classification.service';
import { GeminiProvider } from './providers/gemini.provider';
import { CLASSIFIER } from './classification.interface';

@Module({
  providers: [
    ClassificationService,
    { provide: CLASSIFIER, useClass: GeminiProvider },
  ],
  exports: [ClassificationService],
})
export class ClassificationModule {}
