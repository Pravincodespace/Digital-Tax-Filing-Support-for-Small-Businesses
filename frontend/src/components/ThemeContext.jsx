import React, {createContext, useState, useContext} from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({children}) => {
    const[darkMode, setDarkMode] = useState(false);
    const toggleTheme = () => setDarkMode(!darkMode);
    const themeStyles = {
        backgroundColor: darkMode ? '#121212' : '#ffffff',
        color : darkMode ? '#f5f5f5' : '#333333',
        cardBackground : darkMode ? '#1e1e1e': '#f9f9f9',
        inputBackground : darkMode ? '#2d2d2d': '#ffffff',
        borderColor : darkMode ? '#333333' : '#e0e0e0',
        primaryColor : '#0070f3'
    };
    return (
        <ThemeContext.Provider value = {{darkMode, toggleTheme, themeStyles}}>
            <div style ={{
                backgroundColor : themeStyles.backgroundColor,
                color : themeStyles.color,
                minHeight:'100vh',
                transition: 'all 0.3s ease'
            }}>
                {children}
            </div>
        </ThemeContext.Provider>
    );
};
export const useAppTheme = () => useContext(ThemeContext);