"use client";

import { MotionWrapper } from "../shared/MotionWrapper";
import { BackgroundCanvas } from "./BackgroundCanvas";
import { TitleBlock } from "./TitleBlock";
import { StartOrb } from "./StartOrb";

interface EntryStateProps {
  onStart: () => void;
}

export function EntryState({ onStart }: EntryStateProps) {
  return (
    <MotionWrapper className="relative flex h-screen flex-col items-center justify-center">
      <BackgroundCanvas />
      <TitleBlock />
      <StartOrb onClick={onStart} />
    </MotionWrapper>
  );
}
