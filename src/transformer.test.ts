import transformer from './transformer';
import Node from './ast/node';
import type { Config } from './types';

describe('Transformer', function () {
  describe('attributes', function () {
    describe('string interpolation', function () {
      const createTestNode = (attributes: Record<string, any>): Node => 
        new Node('tag', attributes, [], 'callout');

      const createTestConfig = (variables: Record<string, any> = {}): Config => ({
        variables,
        tags: {
          callout: {
            render: 'div',
            attributes: {
              title: { type: String, render: true }
            }
          }
        }
      });

      it('should interpolate simple string variables', function () {
        const node = createTestNode({ title: 'Hello $name' });
        const config = createTestConfig({ name: 'World' });
        
        const result = transformer.attributes(node, config);
        expect(result.title).toBe('Hello World');
      });

      it('should interpolate number variables', function () {
        const node = createTestNode({ title: 'Count: $count' });
        const config = createTestConfig({ count: 42 });
        
        const result = transformer.attributes(node, config);
        expect(result.title).toBe('Count: 42');
      });

      it('should interpolate boolean variables', function () {
        const node = createTestNode({ title: 'Status: $enabled' });
        const config = createTestConfig({ enabled: true });
        
        const result = transformer.attributes(node, config);
        expect(result.title).toBe('Status: true');
      });

      it('should interpolate nested object properties', function () {
        const node = createTestNode({ title: 'Welcome to $site.name' });
        const config = createTestConfig({ site: { name: 'Markdoc' } });
        
        const result = transformer.attributes(node, config);
        expect(result.title).toBe('Welcome to Markdoc');
      });

      it('should interpolate deep nested properties', function () {
        const node = createTestNode({ title: 'User: $user.profile.name' });
        const config = createTestConfig({ 
          user: { profile: { name: 'John' } } 
        });
        
        const result = transformer.attributes(node, config);
        expect(result.title).toBe('User: John');
      });

      it('should interpolate multiple variables in one string', function () {
        const node = createTestNode({ title: '$greeting $name from $company' });
        const config = createTestConfig({ 
          greeting: 'Hello', 
          name: 'World', 
          company: 'Markdoc' 
        });
        
        const result = transformer.attributes(node, config);
        expect(result.title).toBe('Hello World from Markdoc');
      });

      it('should handle mixed literal and variables', function () {
        const node = createTestNode({ title: 'Welcome to $site.name - $version' });
        const config = createTestConfig({ 
          site: { name: 'Markdoc' }, 
          version: '2.0' 
        });
        
        const result = transformer.attributes(node, config);
        expect(result.title).toBe('Welcome to Markdoc - 2.0');
      });

      it('should keep original when variable not found', function () {
        const node = createTestNode({ title: 'Hello $missing' });
        const config = createTestConfig({ name: 'World' });
        
        const result = transformer.attributes(node, config);
        expect(result.title).toBe('Hello $missing');
      });

      it('should keep original when variables object is empty', function () {
        const node = createTestNode({ title: 'Hello $name' });
        const config = createTestConfig({});
        
        const result = transformer.attributes(node, config);
        expect(result.title).toBe('Hello $name');
      });

      it('should handle null and undefined values', function () {
        const node = createTestNode({ title: 'Null: $nullVal, Undefined: $undefinedVal' });
        const config = createTestConfig({ 
          nullVal: null, 
          undefinedVal: undefined 
        });
        
        const result = transformer.attributes(node, config);
        expect(result.title).toBe('Null: null, Undefined: undefined');
      });

      it('should handle variables with underscores and hyphens', function () {
        const node = createTestNode({ title: 'Hello $user_name from $company-name' });
        const config = createTestConfig({ 
          user_name: 'John', 
          'company-name': 'Markdoc' 
        });
        
        const result = transformer.attributes(node, config);
        expect(result.title).toBe('Hello John from Markdoc');
      });

      it('should not interpolate when config.variables is undefined', function () {
        const node = createTestNode({ title: 'Hello $name' });
        const config: Config = {
          tags: {
            callout: {
              render: 'div',
              attributes: {
                title: { type: String, render: true }
              }
            }
          }
        };
        
        const result = transformer.attributes(node, config);
        expect(result.title).toBe('Hello $name');
      });

      it('should handle complex nested paths', function () {
        const node = createTestNode({ title: 'User: $user.profile.settings.theme' });
        const config = createTestConfig({ 
          user: { 
            profile: { 
              settings: { 
                theme: 'dark' 
              } 
            } 
          } 
        });
        
        const result = transformer.attributes(node, config);
        expect(result.title).toBe('User: dark');
      });

      it('should handle partial path failures gracefully', function () {
        const node = createTestNode({ title: 'User: $user.profile.missing.name' });
        const config = createTestConfig({ 
          user: { 
            profile: { 
              // missing 'missing' property
            } 
          } 
        });
        
        const result = transformer.attributes(node, config);
        expect(result.title).toBe('User: $user.profile.missing.name');
      });

      it('should handle interpolation without adding validation errors during transformation', function () {
        const node = createTestNode({ title: 'Hello $missing and $user.profile.name' });
        const config = createTestConfig({ 
          user: { 
            profile: { 
              name: 'John' 
            } 
          } 
        });
        
        const result = transformer.attributes(node, config);
        
        // Transformation should still work
        expect(result.title).toBe('Hello $missing and John');
        // But no errors should be added during transformation
        expect(node.errors.length).toEqual(0);
      });
    });
  });
}); 