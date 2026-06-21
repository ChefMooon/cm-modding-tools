export type MarkerColor = 'Light Blue' | 'Yellow' | 'Orange' | 'Red' | 'Purple' | 'Blue' | 'Green' | 'Lime' | 'Pink' | 'Silver';
export type MarkerColorSource = 'selected' | 'random';

export type RotationAxisValue = -45 | -22.5 | 0 | 22.5 | 45;

export interface CollisionShape {
  id: string;
  name: string;
  visible: boolean;
  markerColor: MarkerColor;
  markerColorSource: MarkerColorSource;
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
  pivotX: number;
  pivotY: number;
  pivotZ: number;
  rotationX: RotationAxisValue;
  rotationY: RotationAxisValue;
  rotationZ: RotationAxisValue;
}

export interface VoxelProject {
  id: string;
  name: string;
  createdAt: number;
  lastModified: number;
  shapes: CollisionShape[];
}

export interface LocalStorageState {
  version: string;
  activeProjectId: string | null;
  projects: VoxelProject[];
}

export const STORAGE_KEY = 'cm-modding-tools:collision-builder-state';
export const STORAGE_VERSION = '1.1.0';
export const MAX_PROJECTS = 50;
export const MAX_SHAPES_PER_PROJECT = 50;
export const COORDINATE_MIN = -16;
export const COORDINATE_MAX = 32;
export const MARKER_COLORS: MarkerColor[] = ['Light Blue', 'Yellow', 'Orange', 'Red', 'Purple', 'Blue', 'Green', 'Lime', 'Pink', 'Silver'];
export const ROTATION_VALUES: RotationAxisValue[] = [-45, -22.5, 0, 22.5, 45];

export type CollisionBox = CollisionShape;
export type MoveAxis = 'X' | 'Y' | 'Z';