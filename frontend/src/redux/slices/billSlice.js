import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

const API_URL = "/api/bills";

// Get token from state
const getConfig = (token) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const initialState = {
  bills: [],
  bill: null,
  aging: null,
  analytics: null,
  overdueBills: [],
  isLoading: false,
  isSuccess: false,
  isError: false,
  message: '',
};

// Get all bills (with optional filters)
export const getAllBills = createAsyncThunk(
  'bill/getAll',
  async (filters = {}, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      const queryParams = new URLSearchParams(filters).toString();
      const url = queryParams ? `${API_URL}?${queryParams}` : API_URL;
      const response = await api.get(url, getConfig(token));
      return response.data;
    } catch (error) {
      const message =
        (error.response && error.response.data && error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Create bill
export const createBill = createAsyncThunk(
  'bill/create',
  async (billData, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      const response = await api.post(API_URL, billData, getConfig(token));
      return response.data;
    } catch (error) {
      const message =
        (error.response && error.response.data && error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get bill by ID
export const getBillById = createAsyncThunk(
  'bill/getById',
  async (id, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      const response = await api.get(`${API_URL}/${id}`, getConfig(token));
      return response.data;
    } catch (error) {
      const message =
        (error.response && error.response.data && error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Update bill
export const updateBill = createAsyncThunk(
  'bill/update',
  async ({ id, billData }, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      const response = await api.put(`${API_URL}/${id}`, billData, getConfig(token));
      return response.data;
    } catch (error) {
      const message =
        (error.response && error.response.data && error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Delete bill
export const deleteBill = createAsyncThunk(
  'bill/delete',
  async (id, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      await api.delete(`${API_URL}/${id}`, getConfig(token));
      return id;
    } catch (error) {
      const message =
        (error.response && error.response.data && error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Record payment
export const recordPayment = createAsyncThunk(
  'bill/recordPayment',
  async ({ id, paymentData }, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      const response = await api.post(`${API_URL}/${id}/payment`, paymentData, getConfig(token));
      return response.data;
    } catch (error) {
      const message =
        (error.response && error.response.data && error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Apply credit note
export const applyCreditNote = createAsyncThunk(
  'bill/applyCreditNote',
  async ({ id, creditData }, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      const response = await api.post(`${API_URL}/${id}/apply-credit`, creditData, getConfig(token));
      return response.data;
    } catch (error) {
      const message =
        (error.response && error.response.data && error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get bill aging
export const getBillAging = createAsyncThunk(
  'bill/getAging',
  async (_, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      const response = await api.get(`${API_URL}/aging`, getConfig(token));
      return response.data;
    } catch (error) {
      const message =
        (error.response && error.response.data && error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get bill analytics
export const getBillAnalytics = createAsyncThunk(
  'bill/getAnalytics',
  async (_, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      const response = await api.get(`${API_URL}/analytics`, getConfig(token));
      return response.data;
    } catch (error) {
      const message =
        (error.response && error.response.data && error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Approve bill
export const approveBill = createAsyncThunk(
  'bill/approve',
  async (id, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      const response = await api.post(`${API_URL}/${id}/approve`, {}, getConfig(token));
      return response.data;
    } catch (error) {
      const message =
        (error.response && error.response.data && error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Reject bill
export const rejectBill = createAsyncThunk(
  'bill/reject',
  async ({ id, reason }, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      const response = await api.post(`${API_URL}/${id}/reject`, { reason }, getConfig(token));
      return response.data;
    } catch (error) {
      const message =
        (error.response && error.response.data && error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get overdue bills
export const getOverdueBills = createAsyncThunk(
  'bill/getOverdue',
  async (_, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      const response = await api.get(`${API_URL}/overdue`, getConfig(token));
      return response.data;
    } catch (error) {
      const message =
        (error.response && error.response.data && error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Bulk payment
export const bulkPayment = createAsyncThunk(
  'bill/bulkPayment',
  async (paymentData, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      const response = await api.post(`${API_URL}/bulk-payment`, paymentData, getConfig(token));
      return response.data;
    } catch (error) {
      const message =
        (error.response && error.response.data && error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const billSlice = createSlice({
  name: 'bill',
  initialState,
  reducers: {
    reset: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = '';
    },
    clearBill: (state) => {
      state.bill = null;
      state.isSuccess = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get all bills
      .addCase(getAllBills.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getAllBills.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.bills = action.payload;
      })
      .addCase(getAllBills.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Create bill
      .addCase(createBill.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createBill.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.bills.unshift(action.payload.bill || action.payload);
      })
      .addCase(createBill.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Get bill by ID
      .addCase(getBillById.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getBillById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.bill = action.payload;
      })
      .addCase(getBillById.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Update bill
      .addCase(updateBill.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateBill.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        const bill = action.payload.bill || action.payload;
        const index = state.bills.findIndex(b => b._id === bill._id);
        if (index !== -1) {
          state.bills[index] = bill;
        }
      })
      .addCase(updateBill.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Delete bill
      .addCase(deleteBill.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deleteBill.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.bills = state.bills.filter((bill) => bill._id !== action.payload);
      })
      .addCase(deleteBill.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Record payment
      .addCase(recordPayment.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(recordPayment.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        const bill = action.payload.bill || action.payload;
        const index = state.bills.findIndex(b => b._id === bill._id);
        if (index !== -1) {
          state.bills[index] = bill;
        }
        if (state.bill && state.bill._id === bill._id) {
          state.bill = bill;
        }
      })
      .addCase(recordPayment.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Apply credit note
      .addCase(applyCreditNote.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(applyCreditNote.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        const bill = action.payload.bill || action.payload;
        const index = state.bills.findIndex(b => b._id === bill._id);
        if (index !== -1) {
          state.bills[index] = bill;
        }
        if (state.bill && state.bill._id === bill._id) {
          state.bill = bill;
        }
      })
      .addCase(applyCreditNote.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Get bill aging
      .addCase(getBillAging.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getBillAging.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.aging = action.payload;
      })
      .addCase(getBillAging.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Get bill analytics
      .addCase(getBillAnalytics.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getBillAnalytics.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.analytics = action.payload;
      })
      .addCase(getBillAnalytics.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Approve bill
      .addCase(approveBill.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(approveBill.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        const bill = action.payload.bill || action.payload;
        const index = state.bills.findIndex(b => b._id === bill._id);
        if (index !== -1) {
          state.bills[index] = bill;
        }
        if (state.bill && state.bill._id === bill._id) {
          state.bill = bill;
        }
      })
      .addCase(approveBill.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Reject bill
      .addCase(rejectBill.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(rejectBill.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        const bill = action.payload.bill || action.payload;
        const index = state.bills.findIndex(b => b._id === bill._id);
        if (index !== -1) {
          state.bills[index] = bill;
        }
        if (state.bill && state.bill._id === bill._id) {
          state.bill = bill;
        }
      })
      .addCase(rejectBill.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Get overdue bills
      .addCase(getOverdueBills.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getOverdueBills.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.overdueBills = action.payload;
      })
      .addCase(getOverdueBills.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Bulk payment
      .addCase(bulkPayment.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(bulkPayment.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        // Refresh bills list after bulk payment
      })
      .addCase(bulkPayment.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });
  },
});

export const { reset, clearBill } = billSlice.actions;
export default billSlice.reducer;