import { Test, TestingModule } from '@nestjs/testing';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

describe('MediaController', () => {
  let controller: MediaController;
  let service: MediaService;

  const mockMediaService = {
    getMedia: jest.fn(),
    getMediaById: jest.fn(),
    createMedia: jest.fn(),
    updateMedia: jest.fn(),
    deleteMedia: jest.fn(),
    bulkOperation: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [
        {
          provide: MediaService,
          useValue: mockMediaService,
        },
      ],
    }).compile();

    controller = module.get<MediaController>(MediaController);
    service = module.get<MediaService>(MediaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMedia', () => {
    it('should call mediaService.getMedia with formatted query params', async () => {
      mockMediaService.getMedia.mockResolvedValue([]);
      await controller.getMedia('GALLERY', 'IMAGE', 'true', 'true', 'lawn');

      expect(service.getMedia).toHaveBeenCalledWith({
        category: 'GALLERY',
        type: 'IMAGE',
        activeOnly: true,
        isFeatured: true,
        search: 'lawn',
        sortBy: undefined,
        sortOrder: undefined,
      });
    });
  });

  describe('createMedia', () => {
    it('should call mediaService.createMedia', async () => {
      const dto = { url: 'https://test.com/a.jpg', category: 'FOOD' };
      mockMediaService.createMedia.mockResolvedValue({ id: 1, ...dto });

      const result = await controller.createMedia(dto);

      expect(service.createMedia).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: 1, ...dto });
    });
  });

  describe('bulkOperation', () => {
    it('should call mediaService.bulkOperation', async () => {
      mockMediaService.bulkOperation.mockResolvedValue({ count: 2 });

      const result = await controller.bulkOperation('ACTIVATE', [1, 2]);

      expect(service.bulkOperation).toHaveBeenCalledWith('ACTIVATE', [1, 2], undefined);
      expect(result).toEqual({ count: 2 });
    });
  });
});
