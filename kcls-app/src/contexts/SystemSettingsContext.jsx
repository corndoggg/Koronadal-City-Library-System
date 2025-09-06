import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { loadSystemSettings, saveSystemSettings as apiSave } from '../config/systemSettings';

const Ctx = createContext({
  settings: { fine: 5, _source: 'default' },
  loading: true,
  refresh: async () => {},
  save: async () => {},
});

export function SystemSettingsProvider({ children }) {
  const [settings, setSettings] = useState({ fine: 5, _source: 'default' });
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const s = await loadSystemSettings();
    setSettings(s);
    setLoading(false);
  };

  const save = async (partial) => {
    const s = await apiSave(partial);
    setSettings(s);
    return s;
  };

  useEffect(() => { refresh(); }, []);

  const value = useMemo(() => ({ settings, loading, refresh, save }), [settings, loading]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useSystemSettings = () => useContext(Ctx);