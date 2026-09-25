import { GameScreen } from "@/components/GameScreen";
import { PreferencesProvider } from "@/components/PreferencesProvider";

export default function Home() {
  return (
    <PreferencesProvider>
      <GameScreen />
    </PreferencesProvider>
  );
}
