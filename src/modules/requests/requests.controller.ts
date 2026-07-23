import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { RequestsService } from './requests.service';
import { Request } from './entities/request.entity';

// TODO: Replace hardcoded tenantId with JWT-extracted value (task 4.5)
const TEMP_TENANT_ID = 'will-come-from-jwt';

@Controller('v1/requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  create(@Body() body: Partial<Request>): Promise<Request> {
    return this.requestsService.create(TEMP_TENANT_ID, body);
  }

  @Get()
  findAll(): Promise<Request[]> {
    return this.requestsService.findAll(TEMP_TENANT_ID);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Request> {
    return this.requestsService.findOne(TEMP_TENANT_ID, id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Partial<Request>,
  ): Promise<Request> {
    return this.requestsService.update(TEMP_TENANT_ID, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.requestsService.remove(TEMP_TENANT_ID, id);
  }
}
