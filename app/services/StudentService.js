import AsyncStorage from '@react-native-async-storage/async-storage';
import authFetch from '../utils/api';

// Shape used by ID card screen
// {
//   studentId, fullName, branch, profile_image, parentName, homeLocation,
//   phone, bloodGroup, branchPhone
// }

const mapToStudent = (data) => {
  // Strictly from students table payload; do not use user table fallbacks for studentId
  const studentId = data.student_id || data.student_code || data.user_student_id || '';
  const fullName = data.name || data.student_name || 'Student';
  const branch = data.branch_name || data.branch || '';
  const profile_image = data.avatar_url || data.photo || null;
  const parentName = data.father_name || data.parent_name || null;
  const homeLocation = data.home_address || data.address || '';
  const phone = data.father_phone || data.parent_phone || data.phone || null;
  const bloodGroup = data.blood_group || '';
  const branchPhone = data.branch_phone || data.branch_contact || null;

  return {
    studentId,
    fullName,
    branch,
    profile_image,
    parentName,
    homeLocation,
    phone,
    bloodGroup,
    branchPhone,
  };
};

export const StudentService = {
  async getStudents() {
    // For now, return the current student as a single-item list
    const storedUser = await AsyncStorage.getItem('userData');
    if (!storedUser) return [];
    const user = JSON.parse(storedUser);
    try {
      const resp = await authFetch(`/api/get_student_details.php?id=${user.id}`);
      const result = await resp.json();
      if (result?.success && result.data) {
        const s = mapToStudent(result.data);
        return [s];
      }
      // No fallback to user table for studentId
      return [];
    } catch (e) {
      return [];
    }
  },
};

export default StudentService;

