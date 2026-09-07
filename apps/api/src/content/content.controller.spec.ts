import { Test, TestingModule } from '@nestjs/testing';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';

describe('ContentController', () => {
  let controller: ContentController;
  let service: ContentService;

  const mockContentBlock = {
    id: 1,
    key: 'home.hero.title',
    title: 'River Mist Resort',
    category: 'HERO',
    active: true,
  };

  const mockContentService = {
    getContent: jest.fn().mockResolvedValue([mockContentBlock]),
    getContentByKey: jest.fn().mockResolvedValue(mockContentBlock),
    upsertContent: jest.fn().mockResolvedValue(mockContentBlock),
    deleteContent: jest.fn().mockResolvedValue(mockContentBlock),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContentController],
      providers: [
        {
          provide: ContentService,
          useValue: mockContentService,
        },
      ],
    }).compile();

    controller = module.get<ContentController>(ContentController);
    service = module.get<ContentService>(ContentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service.getContent on GET /content', async () => {
    const res = await controller.getContent('HERO', 'false');
    expect(res).toEqual([mockContentBlock]);
    expect(service.getContent).toHaveBeenCalledWith('HERO', true);
  });

  it('should call service.getContent with activeOnly=false when all=true', async () => {
    const res = await controller.getContent('HERO', 'true');
    expect(res).toEqual([mockContentBlock]);
    expect(service.getContent).toHaveBeenCalledWith('HERO', false);
  });

  it('should call service.getContentByKey on GET /content/:key', async () => {
    const res = await controller.getContentByKey('home.hero.title');
    expect(res).toEqual(mockContentBlock);
    expect(service.getContentByKey).toHaveBeenCalledWith('home.hero.title');
  });

  it('should call service.upsertContent on POST /content', async () => {
    const dto: any = { key: 'home.hero.title', title: 'River Mist Resort' };
    const req = { user: { id: 1 } };
    const res = await controller.upsertContent(req as any, dto);
    expect(res).toEqual(mockContentBlock);
    expect(service.upsertContent).toHaveBeenCalledWith(dto, 1);
  });

  it('should call service.deleteContent on DELETE /content/:key', async () => {
    const req = { user: { id: 1 } };
    const res = await controller.deleteContent(req as any, 'home.hero.title');
    expect(res).toEqual(mockContentBlock);
    expect(service.deleteContent).toHaveBeenCalledWith('home.hero.title', 1);
  });
});
