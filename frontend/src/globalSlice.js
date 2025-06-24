import { createSlice } from "@reduxjs/toolkit";

const globalSlice = createSlice({
  name: "global",
  initialState: {
    selectedLearningGoal: null,
    learningGoals: [],
    chatHistory: [],
    isGenerating: false,
    isLearningPathQuery: false,
    isQuizQuery: false,
    preferences: {
      timeValue: 15,
      ageGroup: "Above 18",
      language: "English",
      role: "Student",
    },
  },
  reducers: {
    setSelectedLearningGoal: (state, action) => {
      state.selectedLearningGoal = action.payload;
    },
    setLearningGoals: (state, action) => {
      state.learningGoals = action.payload;
    },
    setChatHistory: (state, action) => {
      state.chatHistory = action.payload;
    },
    setIsQuizQuery: (state, action) => {
      state.isQuizQuery = action.payload;
    },
    setStreamChat: (state, action) => {
      const message = action.payload;
      if (
        state.chatHistory?.length > 0 &&
        state.chatHistory[state.chatHistory.length - 1].type === "streaming"
      ) {
        state.chatHistory[state.chatHistory.length - 1].content = message;
      }
    },
    markTopicCompleted: (state, action) => {
      const { goal, topic, index } = action.payload;
      const goalIndex = state.learningGoals.findIndex((g) => g.name === goal.name);
      if (goalIndex === -1) return;

      state.learningGoals[goalIndex].study_plans[0].topics[index].completed = true;
      state.learningGoals[goalIndex].progress = state.learningGoals[goalIndex].progress ? Number(state.learningGoals[goalIndex].progress) + 20 : 20;
    },
    addMessage: (state, action) => {
      state.chatHistory.push(action.payload);
      if (action.payload.role === "assistant" && action.payload.type === "streaming") {
        state.isGenerating = true;
      }
      if (action.payload.isLearningPathQuery) {
        state.isLearningPathQuery = true;
      }
    },
    addTemporaryMessage: (state, action) => {
      // Add a temporary message for quick actions
      state.chatHistory.push(action.payload);
    },
    updateLatestMessage: (state, action) => {
      const lastMessage = state.chatHistory[state.chatHistory.length - 1];
      if (lastMessage?.type === "streaming") {
        lastMessage.content = action.payload.content;
      }
    },
    setIsGenerating: (state, action) => {
      state.isGenerating = action.payload;
    },
    setIsLearningPathQuery: (state, action) => {
      state.isLearningPathQuery = action.payload;
    },
    setPreferences: (state, action) => {
      state.preferences = { ...state.preferences, ...action.payload };
    },
  },
});

export const {
  setSelectedLearningGoal,
  setLearningGoals,
  setChatHistory,
  addMessage,
  addTemporaryMessage,
  updateLatestMessage,
  setIsGenerating,
  setIsLearningPathQuery,
  setStreamChat,
  markTopicCompleted,
  setPreferences,
  setIsQuizQuery
} = globalSlice.actions;

export default globalSlice.reducer;