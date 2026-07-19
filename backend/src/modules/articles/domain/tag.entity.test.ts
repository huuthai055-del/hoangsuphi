import { describe, expect, test } from 'bun:test';
import { ArticleDomainError } from './article-errors';
import { Tag, type TagProps } from './tag.entity';

describe('Tag Entity', () => {
  const id = '019f4bc4-f550-7d52-bba4-3b6258b55702';
  const name = 'Ruộng bậc thang';
  const slug = 'ruong-bac-thang';
  const description = 'Terrace fields tag';

  test('should successfully create a tag', () => {
    const tag = Tag.create(id, name, slug, description, true);
    expect(tag.id).toBe(id);
    expect(tag.name).toBe(name);
    expect(tag.slug).toBe(slug);
    expect(tag.description).toBe(description);
    expect(tag.isFeatured).toBeTrue();
    expect(tag.createdAt).toBeInstanceOf(Date);
  });

  test('should throw validation error on empty fields', () => {
    expect(() => Tag.create('', name, slug, description)).toThrow(ArticleDomainError);
    expect(() => Tag.create(id, '  ', slug, description)).toThrow(ArticleDomainError);
    expect(() => Tag.create(id, name, '', description)).toThrow(ArticleDomainError);
  });

  test('should throw validation error on invalid slug format', () => {
    expect(() => Tag.create(id, name, 'Ruong-Bac-Thang', description)).toThrow(ArticleDomainError);
    expect(() => Tag.create(id, name, 'ruong_bac_thang', description)).toThrow(ArticleDomainError);
  });

  test('should successfully rehydrate a tag', () => {
    const props: TagProps = {
      id,
      name,
      slug,
      description,
      isFeatured: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const tag = Tag.rehydrate(props);
    expect(tag.id).toBe(id);
    expect(tag.name).toBe(name);
  });

  test('should throw error on invalid rehydrate props', () => {
    const invalidProps: any = { id: '', name: '' };
    expect(() => Tag.rehydrate(invalidProps)).toThrow(ArticleDomainError);
  });

  test('should successfully rename a tag', () => {
    const tag = Tag.create(id, name, slug, description);
    const now = new Date(Date.now() + 1000);
    tag.rename('New Tag Name', now);
    expect(tag.name).toBe('New Tag Name');
    expect(tag.updatedAt).toEqual(now);
  });

  test('should throw error when renaming to empty name', () => {
    const tag = Tag.create(id, name, slug, description);
    expect(() => tag.rename('  ')).toThrow(ArticleDomainError);
  });

  test('should successfully change description', () => {
    const tag = Tag.create(id, name, slug, description);
    const now = new Date(Date.now() + 1000);
    tag.changeDescription('New Description', now);
    expect(tag.description).toBe('New Description');
    expect(tag.updatedAt).toEqual(now);

    tag.changeDescription(null);
    expect(tag.description).toBeNull();
  });

  test('should feature and unfeature a tag', () => {
    const tag = Tag.create(id, name, slug, description, false);
    const now1 = new Date(Date.now() + 1000);
    tag.feature(now1);
    expect(tag.isFeatured).toBeTrue();
    expect(tag.updatedAt).toEqual(now1);

    // Idempotent feature check
    tag.feature(new Date(Date.now() + 2000));
    expect(tag.updatedAt).toEqual(now1); // stays same

    const now2 = new Date(Date.now() + 3000);
    tag.unfeature(now2);
    expect(tag.isFeatured).toBeFalse();
    expect(tag.updatedAt).toEqual(now2);

    // Idempotent unfeature check
    tag.unfeature(new Date(Date.now() + 4000));
    expect(tag.updatedAt).toEqual(now2); // stays same
  });

  test('should touch tag', () => {
    const tag = Tag.create(id, name, slug, description);
    const now = new Date(Date.now() + 2000);
    tag.touch(now);
    expect(tag.updatedAt).toEqual(now);
  });

  test('should compare tags via equals', () => {
    const tag1 = Tag.create(id, name, slug, description);
    const tag2 = Tag.create(id, 'Other Name', slug, description);
    const tag3 = Tag.create('other-id', name, slug, description);

    expect(tag1.equals(tag2)).toBeTrue();
    expect(tag1.equals(tag3)).toBeFalse();
    expect(tag1.equals(null as any)).toBeFalse();
  });

  test('should convert toPersistence representation', () => {
    const tag = Tag.create(id, name, slug, description);
    const persistence = tag.toPersistence();
    expect(persistence.id).toBe(id);
    expect(persistence.slug).toBe(slug);
  });
});
