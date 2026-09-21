// S8 Who is tested — decides the camera for the face test (rear for a helper, front for self).
// It is also the FIRST check screen, so it carries the PRD safety line for an unconscious person.

import { useAppState } from "../../state/AppState.jsx";
import { useCheck } from "../../state/CheckState.jsx";
import { navigate } from "../../hooks/useHashRoute.js";
import { Button, Header } from "../../components/ui.jsx";
import { StepLabel } from "../../components/check.jsx";
import { IconAlert, IconUser, IconUsers } from "../../components/icons.jsx";

export default function CheckWhoStep({ n, total }) {
  const { t } = useAppState();
  const { startCheck } = useCheck();

  const choose = (testedPerson) => { startCheck(testedPerson); navigate("check", ["lkw"]); };

  return (
    <>
      <Header title={t("check.who.title")} onBack={() => navigate("home")} />
      <StepLabel n={n} total={total} />
      <div className="solid-card solid-warn panel-row"><IconAlert /><strong>{t("check.who.unconscious")}</strong></div>
      <Button label={t("check.who.other")} icon={<IconUsers />} variant="primary" size="tall" onClick={() => choose("other")} />
      <Button label={t("check.who.self")} icon={<IconUser />} size="tall" className="btn-solid" onClick={() => choose("self")} />
    </>
  );
}
