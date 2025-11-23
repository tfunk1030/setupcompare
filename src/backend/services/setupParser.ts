import fs from 'fs';
import path from 'path';
import { SetupFile, SetupParameter } from '../../shared/types';

const labelMap: Record<string, { label: string; category: SetupParameter['category']; unit?: string }> = {
  'suspension.front.left.spring_rate': { label: 'Front Left Spring Rate', category: 'suspension', unit: 'N/mm' },
  'suspension.front.right.spring_rate': { label: 'Front Right Spring Rate', category: 'suspension', unit: 'N/mm' },
  'suspension.rear.left.spring_rate': { label: 'Rear Left Spring Rate', category: 'suspension', unit: 'N/mm' },
  'suspension.rear.right.spring_rate': { label: 'Rear Right Spring Rate', category: 'suspension', unit: 'N/mm' },
  'aero.front.wing': { label: 'Front Wing', category: 'aero' },
  'aero.rear.wing': { label: 'Rear Wing', category: 'aero' },
  'ride_height.front': { label: 'Front Ride Height', category: 'ride_height', unit: 'mm' },
  'ride_height.rear': { label: 'Rear Ride Height', category: 'ride_height', unit: 'mm' },
  'tyre.front.left.pressure': { label: 'Front Left Tyre Pressure', category: 'tyre', unit: 'kPa' },
  'tyre.front.right.pressure': { label: 'Front Right Tyre Pressure', category: 'tyre', unit: 'kPa' },
  'tyre.rear.left.pressure': { label: 'Rear Left Tyre Pressure', category: 'tyre', unit: 'kPa' },
  'tyre.rear.right.pressure': { label: 'Rear Right Tyre Pressure', category: 'tyre', unit: 'kPa' },
  'alignment.front.left.camber': { label: 'Front Left Camber', category: 'alignment', unit: 'deg' },
  'alignment.front.right.camber': { label: 'Front Right Camber', category: 'alignment', unit: 'deg' },
  'alignment.front.left.toe': { label: 'Front Left Toe', category: 'alignment', unit: 'deg' },
  'alignment.front.right.toe': { label: 'Front Right Toe', category: 'alignment', unit: 'deg' },
  'alignment.rear.left.camber': { label: 'Rear Left Camber', category: 'alignment', unit: 'deg' },
  'alignment.rear.right.camber': { label: 'Rear Right Camber', category: 'alignment', unit: 'deg' },
  'alignment.rear.left.toe': { label: 'Rear Left Toe', category: 'alignment', unit: 'deg' },
  'alignment.rear.right.toe': { label: 'Rear Right Toe', category: 'alignment', unit: 'deg' },
  'differential.preload': { label: 'Differential Preload', category: 'differential', unit: 'Nm' },
  'differential.power': { label: 'Differential Power Ramp', category: 'differential', unit: '%' },
  'differential.coast': { label: 'Differential Coast Ramp', category: 'differential', unit: '%' },
  'brakes.bias': { label: 'Brake Bias', category: 'brakes', unit: '%' },
  'fuel.start': { label: 'Starting Fuel', category: 'fuel', unit: 'L' },
  'drivetrain.gear_ratio.final': { label: 'Final Drive', category: 'drivetrain' },
};

export function parseSetupFromString(name: string, content: string): SetupFile {
  const parameters: SetupParameter[] = [];
  let currentSection = 'root';

  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(';')) return;
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      currentSection = trimmed.slice(1, -1).toLowerCase();
      return;
    }

    const [rawKey, rawValue] = trimmed.split('=');
    if (!rawKey || rawValue === undefined) return;
    const key = `${currentSection}.${rawKey.trim()}`.toLowerCase();
    const value = parseValue(rawValue.trim());
    const meta = labelMap[key] || { label: toLabel(key), category: 'other' as const };

    parameters.push({ key, label: meta.label, category: meta.category, unit: meta.unit, value });
  });

  return { name, parameters };
}

export function parseSetupFile(filePath: string): SetupFile {
  const content = fs.readFileSync(path.resolve(filePath), 'utf-8');
  return parseSetupFromString(path.basename(filePath), content);
}

function parseValue(raw: string): number | string {
  const numeric = Number(raw);
  if (!Number.isNaN(numeric)) return numeric;
  return raw;
}

function toLabel(key: string): string {
  return key
    .split('.')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
