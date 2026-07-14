"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/app/lib/firebase";
import { Staff } from "@/app/dashboard/staffs/interface/staff";

interface AuthContextValue {
  user: User | null;
  currentStaff: Staff | null;
  loading: boolean;
  staffLoading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ user: null, currentStaff: null, loading: true, staffLoading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [currentStaff, setCurrentStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [staffLoading, setStaffLoading] = useState(true);
  const staffUnsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      staffUnsubRef.current?.();
      staffUnsubRef.current = null;

      if (firebaseUser) {
        setStaffLoading(true);
        staffUnsubRef.current = onSnapshot(doc(db, "staffs", firebaseUser.uid), (snap) => {
          setCurrentStaff(snap.exists() ? ({ ...snap.data(), docId: snap.id } as Staff) : null);
          setStaffLoading(false);
        });
      } else {
        setCurrentStaff(null);
        setStaffLoading(false);
      }
    });

    return () => {
      unsubAuth();
      staffUnsubRef.current?.();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, currentStaff, loading, staffLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
