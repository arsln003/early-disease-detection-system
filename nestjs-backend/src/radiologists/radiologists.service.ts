import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Radiologist } from 'src/entities/entities/Radiologist';
import { CreateRadiologistDto } from 'src/admin/dto/create-radiologist.dto';
import { UpdateRadiologistDto } from 'src/admin/dto/update-radiologist.dto';
import * as bcrypt from 'bcrypt';
import { OcrService } from 'src/ocr/ocr.service';

@Injectable()
export class RadiologistService {
  constructor(
    @InjectRepository(Radiologist)
    private readonly radiologistRepository: Repository<Radiologist>,
    // private readonly ocrService: OcrService,
  ) {}

  // ---- GET ALL ----
  findAllRadiologists(): Promise<Radiologist[]> {
    return this.radiologistRepository.find({
      relations: ['reports'],
    });
  }

// create
async createRadiologist(dto: CreateRadiologistDto): Promise<Radiologist> {
  // 1️⃣ Validate required fields
  if (!dto.fullname || !dto.email || !dto.password) {
    throw new BadRequestException("fullname, email, and password are required");
  }

  // 2️⃣ Check duplicate email
  const existing = await this.radiologistRepository.findOne({
    where: { email: dto.email }
  });

  if (existing) {
    throw new ConflictException("Radiologist with this email already exists");
  }

    // 3️⃣ Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(dto.password, salt);

  // 3️⃣ Create the radiologist entity
  const radiologist = this.radiologistRepository.create({
    fullname: dto.fullname,
    email: dto.email,
    password: hashedPassword,
    contactnumber: dto.contactnumber ?? null,
    status: dto.status ?? "Active"
  });

  // 4️⃣ Save to database
  return await this.radiologistRepository.save(radiologist);
}


  
  // ---- DELETE ----
  async deleteRadiologist(id: number): Promise<void> {
    const result = await this.radiologistRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Radiologist with id ${id} not found`);
    }
  }

  // ---- UPDATE ----
 async updateRadiologist(
  id: number,
  dto: UpdateRadiologistDto
): Promise<Radiologist> {
  
  const radiologist = await this.radiologistRepository.findOne({
    where: { radiologistid: id }
  });

  if (!radiologist) {
    throw new NotFoundException(`Radiologist with id ${id} not found`);
  }

  // If email is being updated → Check duplicate
  if (dto.email) {
    const existing = await this.radiologistRepository.findOne({
      where: { email: dto.email }
    });

    if (existing && existing.radiologistid !== id) {
      throw new ConflictException("Another radiologist already uses this email");
    }
  }

  // Update fields
  Object.assign(radiologist, dto);

  return this.radiologistRepository.save(radiologist);
}

  async getRadiologistsWithReportCount(): Promise<(Radiologist & { reportsCount: number })[]> {
    const radiologists = await this.radiologistRepository
      .createQueryBuilder('r')
      .leftJoin('r.reports', 'report')
      .loadRelationCountAndMap('r.reportsCount', 'r.reports') // 👈 adds r.reportsCount
      .getMany();

    return radiologists as (Radiologist & { reportsCount: number })[];
  }



async getMyProfile(id: number): Promise<Radiologist> {
    const radiologist = await this.radiologistRepository.findOne({
      where: { radiologistid: id },
      relations: ['reports'],
    });

    if (!radiologist) {
      throw new NotFoundException('Radiologist not found');
    }

    return radiologist;
  }



  // async uploadAndAnalyzeFile(radiologistId: number, file: Express.Multer.File) {
  //   if (!file) {
  //     throw new BadRequestException('File is required');
  //   }

  //   const radiologist = await this.radiologistRepository.findOne({
  //     where: { radiologistid: radiologistId },
  //   });

  //   if (!radiologist) {
  //     throw new NotFoundException('Radiologist not found');
  //   }

  //   const ocrResult = await this.ocrService.processFile(file);

  //   return {
  //     message: 'File processed successfully',
  //     radiologistId,
  //     filename: file.originalname,
  //     mimeType: file.mimetype,
  //     ocrResult,
  //   };
  // }

  // async getMyReports(radiologistId: number) {
  //   const radiologist = await this.radiologistRepository.findOne({
  //     where: { radiologistid: radiologistId },
  //     relations: ['reports'],
  //   });

  //   if (!radiologist) {
  //     throw new NotFoundException('Radiologist not found');
  //   }

  //   return radiologist.reports;
  // }

  async finalizeReport(
    radiologistId: number,
    reportId: number,
    body: { findings: string; impression: string; status?: string },
  ) {
    return {
      message: 'Finalize report logic here',
      radiologistId,
      reportId,
      data: body,
    };
  }


}
