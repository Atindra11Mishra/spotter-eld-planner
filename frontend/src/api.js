import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "";

export async function planTrip(payload) {
  try {
    const response = await axios.post(`${BASE_URL}/api/trip/plan/`, payload, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    const message =
      error.response?.data?.error ||
      error.message ||
      "Unable to plan this trip.";
    throw new Error(message, { cause: error });
  }
}
