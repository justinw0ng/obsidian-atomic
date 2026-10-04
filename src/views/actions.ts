import type FitnessPlugin from "../main";
import { actionActivities } from "../util/action-activities";

export function renderActions(el: HTMLElement, plugin: FitnessPlugin): void {
  el.empty();
  const root = el.createDiv({
    cls: "fitness-plugin atomic-actions fitness-actions",
    attr: { "data-testid": "atomic-actions" },
  });

  for (const activity of actionActivities(plugin.settings.activityTypes)) {
    const button = root.createEl("button", { cls: "atomic-btn", attr: { type: "button" } });
    const dot = button.createSpan({ cls: "atomic-dot" });
    dot.setCssProps({ "--atomic-c": activity.colors[2] });
    button.createSpan({ text: activity.label });
    button.addEventListener("click", () => {
      if (activity.domain === "hobby" && activity.noteModel === "item") {
        void plugin.createHobbyItem(activity);
        return;
      }
      void plugin.createExerciseSession(activity);
    });
  }
}
