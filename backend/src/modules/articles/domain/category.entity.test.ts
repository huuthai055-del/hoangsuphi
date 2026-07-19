import { describe, expect, test } from 'bun:test';
import { ArticleDomainError } from './article-errors';
import { Category, type CategoryProps } from './category.entity';

describe('Category Entity', () => {
  const id = '019f4bc4-f550-7d52-bba4-3b6258b55701';
  const code = 'guides';
  const name = 'Travel Guides';
  const description = 'Useful guides for travelers';

  test('should successfully create a category', () => {
    const category = Category.create(id, code, name, description);
    expect(category.id).toBe(id);
    expect(category.code).toBe(code);
    expect(category.name).toBe(name);
    expect(category.description).toBe(description);
    expect(category.createdAt).toBeInstanceOf(Date);
    expect(category.updatedAt).toBeInstanceOf(Date);
  });

  test('should throw validation error on empty fields', () => {
    expect(() => Category.create('', code, name, description)).toThrow(ArticleDomainError);
    expect(() => Category.create(id, '  ', name, description)).toThrow(ArticleDomainError);
    expect(() => Category.create(id, code, '', description)).toThrow(ArticleDomainError);
  });

  test('should throw validation error on invalid code format', () => {
    expect(() => Category.create(id, 'Guides@@', name, description)).toThrow(ArticleDomainError);
    expect(() => Category.create(id, 'guides_123', name, description)).toThrow(ArticleDomainError);
  });

  test('should successfully rehydrate a category', () => {
    const props: CategoryProps = {
      id,
      code,
      name,
      description,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const category = Category.rehydrate(props);
    expect(category.id).toBe(id);
    expect(category.code).toBe(code);
    expect(category.name).toBe(name);
  });

  test('should throw error on invalid rehydrate props', () => {
    const invalidProps: any = { id: '', code: '' };
    expect(() => Category.rehydrate(invalidProps)).toThrow(ArticleDomainError);
  });

  test('should successfully rename a category', () => {
    const category = Category.create(id, code, name, description);
    const now = new Date(Date.now() + 1000);
    category.rename('New Name', now);
    expect(category.name).toBe('New Name');
    expect(category.updatedAt).toEqual(now);
  });

  test('should throw error when renaming to empty name', () => {
    const category = Category.create(id, code, name, description);
    expect(() => category.rename('  ')).toThrow(ArticleDomainError);
  });

  test('should successfully change description', () => {
    const category = Category.create(id, code, name, description);
    const now = new Date(Date.now() + 1000);
    category.changeDescription('New Description', now);
    expect(category.description).toBe('New Description');
    expect(category.updatedAt).toEqual(now);

    category.changeDescription(null);
    expect(category.description).toBeNull();
  });

  test('should touch category', () => {
    const category = Category.create(id, code, name, description);
    const now = new Date(Date.now() + 2000);
    category.touch(now);
    expect(category.updatedAt).toEqual(now);
  });

  test('should compare categories via equals', () => {
    const category1 = Category.create(id, code, name, description);
    const category2 = Category.create(id, code, 'Another Name', description);
    const category3 = Category.create('other-id', code, name, description);

    expect(category1.equals(category2)).toBeTrue();
    expect(category1.equals(category3)).toBeFalse();
    expect(category1.equals(null as any)).toBeFalse();
  });

  test('should convert toPersistence representation', () => {
    const category = Category.create(id, code, name, description);
    const persistence = category.toPersistence();
    expect(persistence.id).toBe(id);
    expect(persistence.code).toBe(code);
    expect(persistence.name).toBe(name);
  });
});
