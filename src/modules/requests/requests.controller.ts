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
  Query,
} from '@nestjs/common';
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { ListRequestsQueryDto } from './dto/list-requests-query.dto';

// TODO: Replace hardcoded tenantId with JWT-extracted value (task 4.5)
const TEMP_TENANT_ID = '00000000-0000-0000-0000-000000000000';

@Controller('v1/requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  create(@Body() dto: CreateRequestDto) {
    return this.requestsService.create(TEMP_TENANT_ID, dto);
  }

  @Get()
  findAll(@Query() query: ListRequestsQueryDto) {
    return this.requestsService.findAll(TEMP_TENANT_ID);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.requestsService.findOne(TEMP_TENANT_ID, id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRequestDto,
  ) {
    return this.requestsService.update(TEMP_TENANT_ID, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.requestsService.remove(TEMP_TENANT_ID, id);
  }
}
