// context/DataContext.js
import { createContext, useContext, useState } from "react";

const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const [apiData, setApiData] = useState(null);

  return (
    <DataContext.Provider value={{ apiData, setApiData }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);
