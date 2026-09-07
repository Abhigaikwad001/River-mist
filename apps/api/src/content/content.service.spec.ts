import { Test, TestingModule } from '@nestjs/testing';
import { ContentService } from './content.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ContentService', () => {
  let service: ContentService;
  let prisma: any;

  const mockContentBlock = {
    id: 1,
    key: 'home.hero.title',
    title: 'River Mist Resort',
    subtitle: 'Welcome to',
    content: 'Where untouched nature meets luxury.',
    image: 'https://images.unsplash.com/photo-1540541338287',
    category: 'HERO',
    active: true,
    mediaId: null,
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      siteContent: {
        findMany: jest.fn().mockResolvedValue([mockContentBlock]),
        findUnique: jest.fn().mockResolvedValue(mockContentBlock),
        upsert: jest.fn().mockResolvedValue(mockContentBlock),
        delete: jest.fn().mockResolvedValue(mockContentBlock),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<ContentService>(ContentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should fetch active content blocks by category', async () => {
    const res = await service.getContent('HERO', true);
    expect(res).toEqual([mockContentBlock]);
    expect(prisma.siteContent.findMany).toHaveBeenCalledWith({
      where: { active: true, category: 'HERO' },
      include: { media: true },
      orderBy: { key: 'asc' },
    });
  });

  it('should fetch a single content block by key', async () => {
    const res = await service.getContentByKey('home.hero.title');
    expect(res).toEqual(mockContentBlock);
    expect(prisma.siteContent.findUnique).toHaveBeenCalledWith({
      where: { key: 'home.hero.title' },
      include: { media: true },
    });
  });

  it('should throw NotFoundException for missing key', async () => {
    prisma.siteContent.findUnique.mockResolvedValue(null);
    await expect(service.getContentByKey('missing.key')).rejects.toThrow(NotFoundException);
  });

  it('should upsert content block with valid data', async () => {
    const dto = {
      key: 'about.hero.title',
      title: 'About Us',
      subtitle: 'Sanctuary of Luxury',
      content: 'Our resort story',
      category: 'ABOUT',
      active: true,
    };

    const res = await service.upsertContent(dto);
    expect(res).toEqual(mockContentBlock);
    expect(prisma.siteContent.upsert).toHaveBeenCalled();
  });

  it('should reject unsafe javascript: URLs in image field', async () => {
    const dto = {
      key: 'bad.url.key',
      title: 'Bad URL',
      image: 'javascript:alert(1)',
    };

    await expect(service.upsertContent(dto)).rejects.toThrow(BadRequestException);
  });

  it('should sanitize script tags from text content', async () => {
    const dto = {
      key: 'script.key',
      title: 'Safe Title <script>alert("xss")</script>',
      content: 'Body <script>console.log("bad")</script> text',
    };

    await service.upsertContent(dto);
    expect(prisma.siteContent.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          title: 'Safe Title ',
          content: 'Body  text',
        }),
      }),
    );
  });

  it('should delete content block by key', async () => {
    const res = await service.deleteContent('home.hero.title');
    expect(res).toEqual(mockContentBlock);
    expect(prisma.siteContent.delete).toHaveBeenCalledWith({ where: { key: 'home.hero.title' } });
  });
});
