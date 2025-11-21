import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  Platform,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage"; // <-- Added

// ---------- TYPES ----------
type DayItem = {
  id: number;
  day: number;
  name: string;
  tasks: number;
};

type TaskItem = {
  id: string;
  dateId: number;
  title: string;
  done: boolean;
};

// ---------- GET FULL MONTH DAYS ----------
function getMonthDays(): DayItem[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: DayItem[] = [];

  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    days.push({
      id: i,
      day: i,
      name: names[d.getDay()],
      tasks: 0,
    });
  }
  return days;
}

export default function HomeScreen() {
  const fullMonth = getMonthDays();
  const today = new Date().getDate();

  const [startIndex, setStartIndex] = useState(Math.max(today - 3, 0));
  const [selectedDateId, setSelectedDateId] = useState(today);

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const [showDayMenu, setShowDayMenu] = useState(false);

  const [currentTime, setCurrentTime] = useState("");

  // ---------- LOAD TASKS ON START ----------
  useEffect(() => {
    const loadTasks = async () => {
      try {
        const saved = await AsyncStorage.getItem("TASKS");
        if (saved) {
          setTasks(JSON.parse(saved));
        }
      } catch (e) {
        console.log("Error loading tasks:", e);
      }
    };

    loadTasks();
  }, []);

  // ---------- SAVE TASKS ----------
  const saveTasks = async (newList: TaskItem[]) => {
    try {
      await AsyncStorage.setItem("TASKS", JSON.stringify(newList));
    } catch (e) {
      console.log("Error saving tasks:", e);
    }
  };

  // ---------- CLOCK ----------
  useEffect(() => {
    const update = () => {
      setCurrentTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  // ADD TASK
  const addTask = () => {
    if (!newTaskTitle.trim()) return;

    const newTask: TaskItem = {
      id: Math.random().toString(),
      dateId: selectedDateId,
      title: newTaskTitle.trim(),
      done: false,
    };

    const updated = [...tasks, newTask];
    setTasks(updated);
    saveTasks(updated);

    setNewTaskTitle("");
    setModalVisible(false);
  };

  // CHECKBOX
  const toggleTask = (id: string) => {
    const updated = tasks.map((t) =>
      t.id === id ? { ...t, done: !t.done } : t
    );
    setTasks(updated);
    saveTasks(updated);
  };

  // DELETE
  const deleteTask = (id: string) => {
    const updated = tasks.filter((t) => t.id !== id);
    setTasks(updated);
    saveTasks(updated);
  };

  // COUNT TASKS PER DAY
  const daysWithCounts = fullMonth.map((d) => ({
    ...d,
    tasks: tasks.filter((t) => t.dateId === d.id).length,
  }));

  // 5-DAY WINDOW
  const visibleDays = daysWithCounts.slice(startIndex, startIndex + 5);

  const goPrev = () => {
    if (startIndex > 0) setStartIndex(startIndex - 1);
  };
  const goNext = () => {
    if (startIndex < fullMonth.length - 5) setStartIndex(startIndex + 1);
  };

  // SHORT DATE
  const selectedDateObj = new Date();
  selectedDateObj.setDate(selectedDateId);

  const dayShort = selectedDateObj.toLocaleDateString("en-US", {
    weekday: "short",
  });

  const monthShort = selectedDateObj.toLocaleDateString("en-US", {
    month: "short",
  });

  const tasksForSelectedDate = tasks.filter((t) => t.dateId === selectedDateId);

  // PRIORITY UP
  const moveTaskUp = (id: string) => {
    const list = [...tasks];
    const index = list.findIndex(
      (t) => t.id === id && t.dateId === selectedDateId
    );
    if (index > 0 && list[index - 1].dateId === selectedDateId) {
      const temp = list[index - 1];
      list[index - 1] = list[index];
      list[index] = temp;
      setTasks(list);
      saveTasks(list);
    }
  };

  // PRIORITY DOWN
  const moveTaskDown = (id: string) => {
    const list = [...tasks];
    const index = list.findIndex(
      (t) => t.id === id && t.dateId === selectedDateId
    );
    if (index < list.length - 1 && list[index + 1].dateId === selectedDateId) {
      const temp = list[index + 1];
      list[index + 1] = list[index];
      list[index] = temp;
      setTasks(list);
      saveTasks(list);
    }
  };

  return (
    <SafeAreaView
      style={styles.container}
      onStartShouldSetResponder={() => {
        setShowDayMenu(false);
        return false;
      }}
    >
      {/* ---------- HEADER ---------- */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>To Do List</Text>

        {/* WHITE LINE — ONLY WHEN MENU IS CLOSED */}
        {!showDayMenu && (
          <TouchableOpacity
            style={styles.whiteLine}
            onPress={() => setShowDayMenu(true)}
          />
        )}

        {/* DAY MENU */}
        {showDayMenu && (
          <View>
            <View style={styles.daysRow}>
              <TouchableOpacity onPress={goPrev}>
                <Text style={styles.arrow}>◀</Text>
              </TouchableOpacity>

              <FlatList
                horizontal
                data={visibleDays}
                showsHorizontalScrollIndicator={false}
                keyExtractor={(d) => d.id.toString()}
                renderItem={({ item }) => {
                  const isActive = item.id === selectedDateId;

                  return (
                    <TouchableOpacity
                      onPress={() => setSelectedDateId(item.id)}
                      style={[styles.dayCard, isActive && styles.dayCardActive]}
                    >
                      <Text
                        style={[
                          styles.dayName,
                          isActive && styles.dayNameActive,
                        ]}
                      >
                        {item.name}
                      </Text>

                      <Text
                        style={[
                          styles.dayNumber,
                          isActive && styles.dayNumberActive,
                        ]}
                      >
                        {item.day}
                      </Text>

                      {item.tasks > 0 && <View style={styles.greenUnderline} />}
                    </TouchableOpacity>
                  );
                }}
              />

              <TouchableOpacity onPress={goNext}>
                <Text style={styles.arrow}>▶</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* ---------- SHORT DATE + TIME ---------- */}
      <View style={{ alignItems: "center", marginTop: 15 }}>
        <Text style={styles.dayShortLabel}>
          {dayShort} • {monthShort} • {selectedDateId}
        </Text>

        <Text style={styles.timeText}>{currentTime}</Text>
      </View>

      {/* ---------- TASKS HEADER ---------- */}
      <View style={styles.tasksHeader}>
        <Text style={styles.tasksTitle}>TASKS</Text>
        <View style={styles.tasksUnderline} />
      </View>

      {/* ---------- TASK LIST ---------- */}
      <FlatList
        data={tasksForSelectedDate}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingHorizontal: 20 }}
        renderItem={({ item }) => (
          <View style={styles.taskCard}>
            {/* UP ARROW */}
            <TouchableOpacity onPress={() => moveTaskUp(item.id)}>
              <Text style={styles.priorityArrow}>↑</Text>
            </TouchableOpacity>

            {/* CHECKBOX */}
            <TouchableOpacity
              style={[styles.checkbox, item.done && styles.checkboxChecked]}
              onPress={() => toggleTask(item.id)}
            >
              {item.done && <Text style={styles.checkboxTick}>✓</Text>}
            </TouchableOpacity>

            {/* TITLE */}
            <Text style={[styles.taskText, item.done && styles.taskTextDone]}>
              {item.title}
            </Text>

            {/* DELETE BUTTON */}
            <TouchableOpacity
              style={styles.crossButton}
              onPress={() => deleteTask(item.id)}
            >
              <Text style={styles.crossIcon}>✖</Text>
            </TouchableOpacity>

            {/* DOWN ARROW */}
            <TouchableOpacity onPress={() => moveTaskDown(item.id)}>
              <Text style={styles.priorityArrow}>↓</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* ---------- ADD BUTTON ---------- */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.fabPlus}>+</Text>
      </TouchableOpacity>

      {/* ---------- MODAL ---------- */}
      <Modal transparent visible={modalVisible} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>New Task</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Task title..."
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
              returnKeyType="done"
              onSubmitEditing={addTask}
            />

            <View style={styles.modalButtonsRow}>
              <Pressable
                style={[styles.modalButton, styles.modalCancel]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.modalButton, styles.modalAdd]}
                onPress={addTask}
              >
                <Text style={styles.modalButtonText}>Add</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ---------- STYLES ----------
const PRIMARY_RED = "#C03A73";
const LIGHT_BLUE = "#9DD0E3";
const BACKGROUND = "#e6e5e5a9";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND },

  header: {
    backgroundColor: "#4682AA",
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  headerTitle: {
    color: "white",
    fontSize: 22,
    fontWeight: "bold",
  },

  whiteLine: {
    height: 5,
    backgroundColor: "white",
    borderRadius: 4,
    width: "45%",
    marginTop: 12,
  },

  daysRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 14,
  },

  arrow: {
    fontSize: 25,
    color: "white",
    paddingHorizontal: 8,
  },

  dayCard: {
    width: 65,
    height: 70,
    backgroundColor: "white",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    position: "relative",
  },
  dayCardActive: {
    backgroundColor: PRIMARY_RED,
  },

  dayName: { fontSize: 12, color: "#555" },
  dayNameActive: { color: "white" },

  dayNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  dayNumberActive: { color: "white" },

  greenUnderline: {
    position: "absolute",
    bottom: 5,
    width: "60%",
    height: 4,
    backgroundColor: "#76d37a",
    borderRadius: 5,
  },

  dayShortLabel: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },

  timeText: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },

  tasksHeader: {
    marginTop: 15,
    paddingHorizontal: 20,
  },

  tasksTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#C03A73",
  },

  tasksUnderline: {
    width: 60,
    height: 2,
    backgroundColor: "#C03A73",
    borderRadius: 10,
    marginTop: 4,
  },

  taskCard: {
    backgroundColor: LIGHT_BLUE,
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 10,
    marginTop: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  priorityArrow: {
    fontSize: 22,
    fontWeight: "900",
    color: "#333",
  },

  taskText: { flex: 1, fontSize: 16, color: "#333" },
  taskTextDone: { textDecorationLine: "line-through", color: "#777" },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: PRIMARY_RED,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: PRIMARY_RED },
  checkboxTick: { color: "white", fontSize: 16, fontWeight: "bold" },

  crossButton: { paddingHorizontal: 4 },
  crossIcon: { fontSize: 22, color: "#ff3b3b", fontWeight: "bold" },

  fab: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: PRIMARY_RED,
    justifyContent: "center",
    alignItems: "center",
  },
  fabPlus: { fontSize: 36, color: "white" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "80%",
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold" },

  modalInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginTop: 10,
    borderRadius: 8,
  },

  modalButtonsRow: {
    marginTop: 15,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },

  modalButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalCancel: { backgroundColor: "#777" },
  modalAdd: { backgroundColor: PRIMARY_RED },
  modalButtonText: { color: "white", fontWeight: "bold" },
});
