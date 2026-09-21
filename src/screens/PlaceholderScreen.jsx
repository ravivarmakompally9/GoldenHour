// Placeholder for screens that arrive in later milestones (now only #/soon/baseline, until M5).
//
// SAFETY RULE 8 ("never fake results"): until the real emergency check exists, the buttons lead
// here and the screen says plainly that nothing was tested and no alert was sent. It also tells a
// helper in a REAL emergency what to do. It is plain text on purpose — Part 1 contains no link
// that could dial a real emergency number.
//
// Delete this file when M2 (check flow) and M5 (baseline) replace both routes.

import { useAppState } from "../state/AppState.jsx";
import { navigate } from "../hooks/useHashRoute.js";
import { Header, Button, Card } from "../components/ui.jsx";
import { IconAlert } from "../components/icons.jsx";

export default function PlaceholderScreen({ params }) {
  const { t } = useAppState();
  const isBaseline = params[0] === "baseline";
  const goHome = () => navigate("home");

  return (
    <div className="stack">
      <Header title={t("placeholder.title")} onBack={goHome} />
      <Card><p className="instruction">{isBaseline ? t("placeholder.baseline") : t("placeholder.check")}</p></Card>
      {!isBaseline && <div className="panel panel-warn panel-row"><IconAlert /><strong>{t("placeholder.realEmergency")}</strong></div>}
      <Button label={t("placeholder.backHome")} variant="primary" onClick={goHome} />
    </div>
  );
}
