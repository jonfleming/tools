import React, { createContext, useContext, useState } from 'react';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState({
        userId: null,
        name: '',
        email: ''
    });

    const [session, setSession] = useState({
        sessionId: null,
        topic: ''
    });

    return (
        <UserContext.Provider value={{ user, setUser, session, setSession }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    return useContext(UserContext);
};
