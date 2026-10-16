import { NotFoundException } from '@nestjs/common';
import { SamplingHistoryService } from './sampling-history.service';

describe('Associated file sampling count', () => {
  const repo = { count: jest.fn() };
  const users = { findById: jest.fn() };
  const service = new SamplingHistoryService(repo as any, users as any);

  beforeEach(() => jest.resetAllMocks());

  it('counts only the authenticated user and associated file', async () => {
    users.findById.mockResolvedValue({ lastUploadedFileHash: 'associated-hash' });
    repo.count.mockResolvedValue(3);
    await expect(service.getAssociatedFileCount('user-1')).resolves.toEqual({ count: 3 });
    expect(users.findById).toHaveBeenCalledWith('user-1');
    expect(repo.count).toHaveBeenCalledWith({
      where: { userId: 'user-1', fileHash: 'associated-hash' },
    });
  });

  it('returns zero without counting unrelated history when no file is associated', async () => {
    users.findById.mockResolvedValue({ lastUploadedFileHash: null });
    await expect(service.getAssociatedFileCount('user-1')).resolves.toEqual({ count: 0 });
    expect(repo.count).not.toHaveBeenCalled();
  });

  it('rejects a missing user', async () => {
    users.findById.mockResolvedValue(null);
    await expect(service.getAssociatedFileCount('missing')).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.count).not.toHaveBeenCalled();
  });
});
