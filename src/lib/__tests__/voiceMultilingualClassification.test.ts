import { describe, expect, it } from "vitest";
import { classifyTranscript } from "@/lib/voice.functions";

describe("multilingual voice classification fallback", () => {
  it("classifies Greek tasks and tomorrow correctly", () => {
    const result = classifyTranscript("Υπενθύμισέ μου να πάρω τον Γιώργο τηλέφωνο αύριο");
    expect(result.type).toBe("tasks");
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const expected = [
      tomorrow.getFullYear(),
      String(tomorrow.getMonth() + 1).padStart(2, "0"),
      String(tomorrow.getDate()).padStart(2, "0"),
    ].join("-");
    expect(result.dueDate).toBe(expected);
  });

  it("classifies Greek notes and ideas", () => {
    expect(classifyTranscript("Σημείωση να κρατήσω τα βασικά από τη συνάντηση").type).toBe("notes");
    expect(classifyTranscript("Ιδέα να φτιάξουμε νέο dashboard").type).toBe("ideas");
  });

  it("classifies common multilingual task cues", () => {
    expect(classifyTranscript("Tarea llamar al cliente mañana").type).toBe("tasks");
    expect(classifyTranscript("Aufgabe Kunde morgen anrufen").type).toBe("tasks");
    expect(classifyTranscript("Задача позвонить клиенту завтра").type).toBe("tasks");
  });

  it("detects multilingual link cues", () => {
    expect(classifyTranscript("Σύνδεσμος example.com για αργότερα").type).toBe("links");
  });
});
