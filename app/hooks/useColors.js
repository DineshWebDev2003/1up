import { useTheme } from '../contexts/ThemeContext';
import { getColors } from '../constants/colors';

export const useColors = () => {
  const { isDarkMode } = useTheme();
  return getColors(isDarkMode);
};
