import { Redirect } from 'expo-router';

export default function Index() {
    // Redirect to the admin home page by default
    return <Redirect href="/login" />;
}
