import { Book, Reservation, ReservationFormData } from '../types/library';
import { INITIAL_BOOKS, INITIAL_RESERVATIONS } from '../data/mockData';

const STORAGE_KEY_URL = 'smart_lib_apps_script_url';
const STORAGE_KEY_BOOKS = 'smart_lib_local_books';
const STORAGE_KEY_RESERVATIONS = 'smart_lib_local_reservations';

export const getStoredBaseUrl = (): string => {
  return localStorage.getItem(STORAGE_KEY_URL) || '';
};

export const setStoredBaseUrl = (url: string): void => {
  if (url.trim()) {
    localStorage.setItem(STORAGE_KEY_URL, url.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY_URL);
  }
};

// Check if URL is valid and not placeholder
export const isConfiguredUrl = (url: string): boolean => {
  return Boolean(
    url &&
    url.trim() !== '' &&
    url.trim() !== 'YOUR_APPS_SCRIPT_WEBAPP_URL' &&
    url.startsWith('https://script.google.com/macros/s/')
  );
};

// Local storage mock helpers for seamless zero-setup demo
const getMockBooks = (): Book[] => {
  const saved = localStorage.getItem(STORAGE_KEY_BOOKS);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // fallback
    }
  }
  localStorage.setItem(STORAGE_KEY_BOOKS, JSON.stringify(INITIAL_BOOKS));
  return INITIAL_BOOKS;
};

const saveMockBooks = (books: Book[]) => {
  localStorage.setItem(STORAGE_KEY_BOOKS, JSON.stringify(books));
};

const getMockReservations = (): Reservation[] => {
  const saved = localStorage.getItem(STORAGE_KEY_RESERVATIONS);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // fallback
    }
  }
  localStorage.setItem(STORAGE_KEY_RESERVATIONS, JSON.stringify(INITIAL_RESERVATIONS));
  return INITIAL_RESERVATIONS;
};

const saveMockReservations = (reservations: Reservation[]) => {
  localStorage.setItem(STORAGE_KEY_RESERVATIONS, JSON.stringify(reservations));
};

export const resetLocalMockData = () => {
  localStorage.setItem(STORAGE_KEY_BOOKS, JSON.stringify(INITIAL_BOOKS));
  localStorage.setItem(STORAGE_KEY_RESERVATIONS, JSON.stringify(INITIAL_RESERVATIONS));
};

/**
 * 도서 목록 조회 API
 * GET BaseURL + "?action=getBooks"
 */
export async function fetchBooks(baseUrl: string): Promise<Book[]> {
  if (!isConfiguredUrl(baseUrl)) {
    // Demo mode: simulate network delay
    await new Promise((r) => setTimeout(r, 350));
    return getMockBooks();
  }

  const endpoint = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}action=getBooks`;
  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      redirect: 'follow',
    });

    if (!res.ok) {
      throw new Error(`서버 응답 오류 (HTTP ${res.status})`);
    }

    const data = await res.json();
    if (Array.isArray(data)) {
      return data;
    }
    if (data.books && Array.isArray(data.books)) {
      return data.books;
    }
    if (data.success === false) {
      throw new Error(data.error || data.message || '도서 목록을 불러오지 못했습니다.');
    }
    return [];
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('fetchBooks error:', err);
    throw new Error(`Google Apps Script 연결 실패: ${errorMsg}`);
  }
}

/**
 * 예약 목록 조회 API
 * GET BaseURL + "?action=getReservations"
 */
export async function fetchReservations(baseUrl: string): Promise<Reservation[]> {
  if (!isConfiguredUrl(baseUrl)) {
    await new Promise((r) => setTimeout(r, 300));
    return getMockReservations().filter((r) => r.status === 'ACTIVE');
  }

  const endpoint = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}action=getReservations`;
  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      redirect: 'follow',
    });

    if (!res.ok) {
      throw new Error(`서버 응답 오류 (HTTP ${res.status})`);
    }

    const data = await res.json();
    if (Array.isArray(data)) {
      return data.filter((item: Reservation) => item.status === 'ACTIVE' || !item.status);
    }
    if (data.reservations && Array.isArray(data.reservations)) {
      return data.reservations.filter((item: Reservation) => item.status === 'ACTIVE' || !item.status);
    }
    if (data.success === false) {
      throw new Error(data.error || data.message || '예약 목록을 불러오지 못했습니다.');
    }
    return [];
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('fetchReservations error:', err);
    throw new Error(`Google Apps Script 연결 실패: ${errorMsg}`);
  }
}

/**
 * 도서 예약하기 API
 * POST BaseURL
 * Body: { action: "createReservation", data: { book_id, user_name, user_email } }
 * 필수 옵션: redirect: 'follow'
 */
export async function createReservation(
  baseUrl: string,
  formData: ReservationFormData
): Promise<{ success: boolean; message: string; res_id?: string }> {
  if (!isConfiguredUrl(baseUrl)) {
    // Local demo simulation
    await new Promise((r) => setTimeout(r, 500));
    const books = getMockBooks();
    const targetBook = books.find((b) => b.id === formData.book_id);
    if (!targetBook) {
      throw new Error('도서를 찾을 수 없습니다.');
    }
    if (targetBook.status === 'RESERVED') {
      throw new Error('이미 예약된 도서입니다.');
    }

    // Update book status
    targetBook.status = 'RESERVED';
    saveMockBooks(books);

    // Create reservation
    const reservations = getMockReservations();
    const newResId = 'R' + Date.now().toString().slice(-6);
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newReservation: Reservation = {
      res_id: newResId,
      book_id: targetBook.id,
      book_title: targetBook.title,
      user_name: formData.user_name,
      user_email: formData.user_email,
      reserved_at: formattedDate,
      status: 'ACTIVE'
    };
    reservations.unshift(newReservation);
    saveMockReservations(reservations);

    return {
      success: true,
      message: `'${targetBook.title}' 도서 예약이 완료되었습니다.`,
      res_id: newResId
    };
  }

  try {
    // Note: We send 'text/plain;charset=utf-8' so browsers do NOT trigger CORS OPTIONS preflight,
    // which Apps Script doesn't handle natively, while doPost safely parses JSON.parse(e.postData.contents).
    const payload = {
      action: 'createReservation',
      data: {
        book_id: formData.book_id,
        user_name: formData.user_name,
        user_email: formData.user_email
      }
    };

    const res = await fetch(baseUrl, {
      method: 'POST',
      redirect: 'follow', // 필수 요구사항
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`서버 응답 오류 (HTTP ${res.status})`);
    }

    const data = await res.json();
    if (data.success === false) {
      throw new Error(data.message || '예약 처리에 실패했습니다.');
    }

    return {
      success: true,
      message: data.message || '도서 예약이 성공적으로 완료되었습니다.',
      res_id: data.res_id
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('createReservation error:', err);
    throw new Error(errorMsg);
  }
}

/**
 * 예약 취소하기 API
 * POST BaseURL
 * Body: { action: "cancelReservation", res_id: "R001" }
 * 필수 옵션: redirect: 'follow'
 */
export async function cancelReservation(
  baseUrl: string,
  resId: string
): Promise<{ success: boolean; message: string }> {
  if (!isConfiguredUrl(baseUrl)) {
    // Local demo simulation
    await new Promise((r) => setTimeout(r, 450));
    const reservations = getMockReservations();
    const targetIdx = reservations.findIndex((r) => r.res_id === resId);
    if (targetIdx === -1) {
      throw new Error('해당 예약 정보를 찾을 수 없습니다.');
    }

    const targetRes = reservations[targetIdx];
    targetRes.status = 'CANCELLED';
    reservations.splice(targetIdx, 1);
    saveMockReservations(reservations);

    // Free the book
    const books = getMockBooks();
    const book = books.find((b) => b.id === targetRes.book_id);
    if (book) {
      book.status = 'AVAILABLE';
      saveMockBooks(books);
    }

    return {
      success: true,
      message: `'${targetRes.book_title}' 예약이 정상적으로 취소되었습니다.`
    };
  }

  try {
    const payload = {
      action: 'cancelReservation',
      res_id: resId
    };

    const res = await fetch(baseUrl, {
      method: 'POST',
      redirect: 'follow', // 필수 요구사항
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`서버 응답 오류 (HTTP ${res.status})`);
    }

    const data = await res.json();
    if (data.success === false) {
      throw new Error(data.message || '예약 취소 처리에 실패했습니다.');
    }

    return {
      success: true,
      message: data.message || '예약이 성공적으로 취소되었습니다.'
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('cancelReservation error:', err);
    throw new Error(errorMsg);
  }
}
