import * as fs from 'fs';
import {describe, expect, test} from 'vitest';
import {writeTempProject} from './project-writer';

const sampleDefinition = {
  settings: {width: 1920, height: 1080, fps: 30},
  scenes: [
    {
      id: 'test',
      nodes: [{id: 'r', type: 'Rect', props: {width: 100, fill: '#fff', opacity: 0}}],
      timeline: [{target: 'r', prop: 'opacity', to: 1, duration: 0.5}],
    },
  ],
};

describe('writeTempProject', () => {
  test('creates a file that exists on disk', () => {
    const {projectFile, cleanup} = writeTempProject(sampleDefinition);
    try {
      expect(fs.existsSync(projectFile)).toBe(true);
    } finally {
      cleanup();
    }
  });

  test('project file has a .ts extension', () => {
    const {projectFile, cleanup} = writeTempProject(sampleDefinition);
    try {
      expect(projectFile.endsWith('.ts')).toBe(true);
    } finally {
      cleanup();
    }
  });

  test('file imports makeProject and createScenesFromJSON', () => {
    const {projectFile, cleanup} = writeTempProject(sampleDefinition);
    try {
      const src = fs.readFileSync(projectFile, 'utf8');
      expect(src).toContain("from '@reelgen/core'");
      expect(src).toContain("from '@reelgen/scene-builder'");
      expect(src).toContain('makeProject');
      expect(src).toContain('createScenesFromJSON');
    } finally {
      cleanup();
    }
  });

  test('file inlines the scene definition as JSON', () => {
    const {projectFile, cleanup} = writeTempProject(sampleDefinition);
    try {
      const src = fs.readFileSync(projectFile, 'utf8');
      expect(src).toContain('"scenes"');
      expect(src).toContain('"test"'); // scene id
      expect(src).toContain('"Rect"'); // node type
    } finally {
      cleanup();
    }
  });

  test('inlined JSON is valid and matches the definition', () => {
    const {projectFile, cleanup} = writeTempProject(sampleDefinition);
    try {
      const src = fs.readFileSync(projectFile, 'utf8');
      // Extract the JSON object assigned to `definition`
      const match = src.match(/const definition = ([\s\S]*?);\n/);
      expect(match).not.toBeNull();
      const parsed = JSON.parse(match![1]);
      expect(parsed).toEqual(sampleDefinition);
    } finally {
      cleanup();
    }
  });

  test('cleanup removes the temp file', () => {
    const {projectFile, cleanup} = writeTempProject(sampleDefinition);
    expect(fs.existsSync(projectFile)).toBe(true);
    cleanup();
    expect(fs.existsSync(projectFile)).toBe(false);
  });

  test('cleanup is idempotent (calling twice does not throw)', () => {
    const {cleanup} = writeTempProject(sampleDefinition);
    cleanup();
    expect(() => cleanup()).not.toThrow();
  });

  test('each call creates a distinct temp file', () => {
    const a = writeTempProject(sampleDefinition);
    const b = writeTempProject(sampleDefinition);
    try {
      expect(a.projectFile).not.toBe(b.projectFile);
    } finally {
      a.cleanup();
      b.cleanup();
    }
  });

  test('handles special characters in string props without breaking JSON', () => {
    const def = {
      scenes: [
        {
          id: 'special',
          nodes: [{type: 'Txt', props: {text: 'It\'s "quoted" & <escaped>'}}],
          timeline: [],
        },
      ],
    };
    const {projectFile, cleanup} = writeTempProject(def);
    try {
      const src = fs.readFileSync(projectFile, 'utf8');
      const match = src.match(/const definition = ([\s\S]*?);\n/);
      expect(() => JSON.parse(match![1])).not.toThrow();
    } finally {
      cleanup();
    }
  });
});
