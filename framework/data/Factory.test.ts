import { describe, it, expect, beforeEach } from 'vitest';
import { Factory } from './Factory.js';

interface User {
  id: number;
  name: string;
  email: string;
  active: boolean;
}

interface Product {
  sku: string;
  name: string;
  price: number;
  category: string;
}

describe('Factory', () => {
  const userDefaults: User = {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    active: true,
  };

  describe('build()', () => {
    it('should return object with default values', () => {
      const factory = new Factory(userDefaults);
      const user = factory.build();

      expect(user).toEqual({
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        active: true,
      });
    });

    it('should override specific properties', () => {
      const factory = new Factory(userDefaults);
      const user = factory.build({ name: 'Jane Doe', email: 'jane@example.com' });

      expect(user).toEqual({
        id: 1,
        name: 'Jane Doe',
        email: 'jane@example.com',
        active: true,
      });
    });

    it('should allow overriding all properties', () => {
      const factory = new Factory(userDefaults);
      const user = factory.build({
        id: 99,
        name: 'Custom User',
        email: 'custom@example.com',
        active: false,
      });

      expect(user).toEqual({
        id: 99,
        name: 'Custom User',
        email: 'custom@example.com',
        active: false,
      });
    });

    it('should not mutate defaults', () => {
      const originalDefaults: User = {
        id: 1,
        name: 'Original',
        email: 'original@example.com',
        active: true,
      };
      const factory = new Factory(originalDefaults);

      factory.build({ name: 'Modified' });
      factory.build({ email: 'changed@example.com' });

      expect(originalDefaults).toEqual({
        id: 1,
        name: 'Original',
        email: 'original@example.com',
        active: true,
      });
    });

    it('should create independent objects each time', () => {
      const factory = new Factory(userDefaults);
      const user1 = factory.build();
      const user2 = factory.build();

      user1.name = 'Modified';

      expect(user2.name).toBe('John Doe');
      expect(user1).not.toBe(user2);
    });
  });

  describe('buildMany()', () => {
    it('should create specified number of objects', () => {
      const factory = new Factory(userDefaults);
      const users = factory.buildMany(5);

      expect(users).toHaveLength(5);
    });

    it('should create zero objects when count is 0', () => {
      const factory = new Factory(userDefaults);
      const users = factory.buildMany(0);

      expect(users).toHaveLength(0);
      expect(users).toEqual([]);
    });

    it('should apply overrides to all objects', () => {
      const factory = new Factory(userDefaults);
      const users = factory.buildMany(3, { active: false });

      expect(users).toHaveLength(3);
      users.forEach((user) => {
        expect(user.active).toBe(false);
        expect(user.name).toBe('John Doe');
      });
    });

    it('should create independent objects', () => {
      const factory = new Factory(userDefaults);
      const users = factory.buildMany(3);

      users[0].name = 'Modified First';
      users[1].name = 'Modified Second';

      expect(users[0].name).toBe('Modified First');
      expect(users[1].name).toBe('Modified Second');
      expect(users[2].name).toBe('John Doe');
    });
  });

  describe('withSequence()', () => {
    it('should apply sequence function to generate unique values', () => {
      const factory = new Factory(userDefaults).withSequence((n) => ({
        id: n,
        email: `user${n}@example.com`,
      }));

      const user1 = factory.build();
      const user2 = factory.build();
      const user3 = factory.build();

      expect(user1.id).toBe(1);
      expect(user1.email).toBe('user1@example.com');

      expect(user2.id).toBe(2);
      expect(user2.email).toBe('user2@example.com');

      expect(user3.id).toBe(3);
      expect(user3.email).toBe('user3@example.com');
    });

    it('should allow overrides to take precedence over sequence', () => {
      const factory = new Factory(userDefaults).withSequence((n) => ({
        id: n,
        name: `User ${n}`,
      }));

      const user = factory.build({ name: 'Custom Name' });

      expect(user.id).toBe(1);
      expect(user.name).toBe('Custom Name');
    });

    it('should return a new factory instance', () => {
      const originalFactory = new Factory(userDefaults);
      const sequencedFactory = originalFactory.withSequence((n) => ({ id: n }));

      expect(sequencedFactory).not.toBe(originalFactory);
      expect(sequencedFactory).toBeInstanceOf(Factory);
    });

    it('should not affect original factory', () => {
      const originalFactory = new Factory(userDefaults);
      const sequencedFactory = originalFactory.withSequence((n) => ({ id: n * 100 }));

      const originalUser = originalFactory.build();
      const sequencedUser = sequencedFactory.build();

      expect(originalUser.id).toBe(1);
      expect(sequencedUser.id).toBe(100);
    });

    it('should work with buildMany', () => {
      const factory = new Factory(userDefaults).withSequence((n) => ({
        id: n,
        email: `user${n}@test.com`,
      }));

      const users = factory.buildMany(3);

      expect(users[0].id).toBe(1);
      expect(users[0].email).toBe('user1@test.com');

      expect(users[1].id).toBe(2);
      expect(users[1].email).toBe('user2@test.com');

      expect(users[2].id).toBe(3);
      expect(users[2].email).toBe('user3@test.com');
    });

    it('should increment sequence across multiple calls', () => {
      const factory = new Factory(userDefaults).withSequence((n) => ({ id: n }));

      factory.build();
      factory.build();
      const thirdUser = factory.build();

      expect(thirdUser.id).toBe(3);
    });
  });

  describe('resetSequence()', () => {
    it('should reset sequence counter to 0', () => {
      const factory = new Factory(userDefaults).withSequence((n) => ({ id: n }));

      factory.build();
      factory.build();
      factory.build();
      factory.resetSequence();

      const user = factory.build();
      expect(user.id).toBe(1);
    });
  });

  describe('with complex types', () => {
    it('should work with different object shapes', () => {
      const productDefaults: Product = {
        sku: 'SKU-001',
        name: 'Test Product',
        price: 99.99,
        category: 'Electronics',
      };

      const factory = new Factory(productDefaults).withSequence((n) => ({
        sku: `SKU-${String(n).padStart(3, '0')}`,
      }));

      const products = factory.buildMany(3);

      expect(products[0].sku).toBe('SKU-001');
      expect(products[1].sku).toBe('SKU-002');
      expect(products[2].sku).toBe('SKU-003');
      expect(products[0].price).toBe(99.99);
    });

    it('should handle nested objects (shallow copy)', () => {
      interface WithNested {
        id: number;
        metadata: { createdAt: string; tags: string[] };
      }

      const defaults: WithNested = {
        id: 1,
        metadata: { createdAt: '2024-01-01', tags: ['default'] },
      };

      const factory = new Factory(defaults);
      const obj1 = factory.build();
      const obj2 = factory.build();

      // Note: Factory does shallow copy, so nested objects are shared
      expect(obj1.metadata).toBe(obj2.metadata);
    });
  });

  describe('type safety', () => {
    it('should enforce type constraints on overrides', () => {
      const factory = new Factory(userDefaults);

      // This should compile and work correctly
      const user = factory.build({
        id: 42,
        name: 'Type Safe',
      });

      expect(user.id).toBe(42);
      expect(user.name).toBe('Type Safe');
    });

    it('should enforce type constraints on sequence function', () => {
      const factory = new Factory(userDefaults).withSequence((n) => ({
        // Only returning partial properties that exist on User
        id: n,
        email: `typed${n}@example.com`,
      }));

      const user = factory.build();
      expect(user.id).toBe(1);
      expect(user.email).toBe('typed1@example.com');
    });
  });
});
