import type { AgeWindowYears } from '@engine';
import type { TargetPreset } from '@model';

export interface TargetControl {
  preset: TargetPreset;
  years: AgeWindowYears;
  browsers: number;
  onChangePreset: (preset: TargetPreset) => void;
  onChangeYears: (years: AgeWindowYears) => void;
}
