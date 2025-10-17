import React, { createContext, useState, useEffect, useContext } from 'react';
import authFetch from '../utils/api';

const CaptainContext = createContext();

const seededRandom = (seed) => {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return () => {
        s = (s * 16807) % 2147483647;
        return (s - 1) / 2147483646;
    };
};

export const CaptainProvider = ({ children }) => {
    const [captain, setCaptain] = useState(null);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const captainRes = await authFetch('/api/get_captain_details.php');
                const captainData = await captainRes.json();
                if (captainData.success) {
                    setCaptain(captainData.data);
                    const studentsRes = await authFetch(`/api/get_branch_students.php?branch_id=${captainData.data.branch_id}`);
                    const studentsData = await studentsRes.json();
                    if (studentsData.success && studentsData.data.length > 0) {
                        const saibabaColony = { latitude: 11.023654, longitude: 76.944028 };
                        const studentsWithLocations = Array.from({ length: 10 }, (_, index) => {
                            const studentData = studentsData.data[index % studentsData.data.length];
                            const uniqueId = parseInt(studentData.id, 10) + index;
                            const random = seededRandom(uniqueId);
                            const angle = random() * 2 * Math.PI;
                            const radius = random() * 0.045;
                            return {
                                ...studentData,
                                id: `${studentData.id}_${index}`,
                                latitude: saibabaColony.latitude + radius * Math.cos(angle),
                                longitude: saibabaColony.longitude + radius * Math.sin(angle),
                                pickedUp: false,
                            };
                        });
                        setStudents(studentsWithLocations);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const value = { captain, students, setStudents, loading };

    return <CaptainContext.Provider value={value}>{children}</CaptainContext.Provider>;
};

export const useCaptain = () => useContext(CaptainContext);

// Default export to fix route warning
export default CaptainProvider;
