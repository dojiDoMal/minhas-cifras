import { configureStore } from '@reduxjs/toolkit'
import cifraReducer from './cifraSlice'

export const store = configureStore({
  reducer: {
    cifra: cifraReducer,
  },
})
