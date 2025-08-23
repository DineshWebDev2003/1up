import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Profile from '../components/Profile';
import CounterBox from '../components/CounterBox';

const thirukkuralData = [
  {
    "குறள் எண்": 1,
    "குறள்": "அகர முதல எழுத்தெல்லாம் ஆதி \nபகவன் முதற்றே உலகு.",
    "விளக்கம்": "எல்லா எழுத்துகளுக்கும் 'அ' எழுத்து ஆரம்பம்; அதுபோல உலகிற்கும் ஆதியாக இருப்பவன் இறைவன்."
  },
  {
    "குறள் எண்": 2,
    "குறள்": "கற்றதனால் ஆய பயனென்கொல் வாலறிவன் \nநற்றாள் தொழாஅர் எனின்.",
    "விளக்கம்": "கற்றாலும், அறிவாளி இறைவனை வணங்காவிடில், அந்தக் கல்வி பயன் அளிக்காது."
  },
  {
    "குறள் எண்": 3,
    "குறள்": "மலர்மிசை ஏகினான் மாணடி சேர்ந்தார் \nநிலமிசை நீடுவாழ் வார்.",
    "விளக்கம்": "இறைவன் திருவடிகளை வணங்குவோர், இவ்வுலகில் நீண்ட ஆயுள் வாழ்வர்."
  },
  {
    "குறள் எண்": 4,
    "குறள்": "வான்நின்று உலகம் வழங்கி வருதலால் \nதான்அந்தம் இல்லன ஆன.",
    "விளக்கம்": "மழை உலகத்திற்கு வாழ்வளிப்பதால் அது தெய்வமாகக் கருதப்படுகிறது."
  },
  {
    "குறள் எண்": 5,
    "குறள்": "இருள்சேர் இருவினையும் சேரா இறைவன் \nபொருள்சேர் புகழ்புரிந்தார் மாட்டு.",
    "விளக்கம்": "இறைவனைப் போற்றுபவர்க்கு இருளான பாவம் அருகாது."
  },
  {
    "குறள் எண்": 6,
    "குறள்": "அகர முதலன பதினெண் கல்வி \nபகரப் பிறப்பே பிற.",
    "விளக்கம்": "கல்வியின் ஆரம்பமும் நிறைவுமாக இருப்பது ஒழுக்கமே."
  },
  {
    "குறள் எண்": 7,
    "குறள்": "துப்பார்க்குத் துப்பாய துப்பாக்கித் துப்பார்க்குத் \nதுப்பாய தூஉம் மழை.",
    "விளக்கம்": "பசித்தவர்க்கு உணவு போல், வறட்சியுற்ற நிலத்திற்கு மழை வாழ்க்கை தருகிறது."
  },
  {
    "குறள் எண்": 8,
    "குறள்": "செல்வத்திற்கு எல்லையே உண்டு; அறத்திற்கு \nஅல்லையே உண்டாகாது.",
    "விளக்கம்": "செல்வத்திற்கே ஒரு எல்லை உண்டு; ஆனால் அறச்செயல்களுக்கு எல்லை இல்லை."
  },
  {
    "குறள் எண்": 9,
    "குறள்": "அன்பு உடையார்க்கு அகலம் இல்லை; அன்பு இல்லார்க்கு \nஇரக்கம் இல்லை.",
    "விளக்கம்": "அன்பு உடையவர்க்கு எல்லையில்லை; அன்பு இல்லாதவர்க்கு இரக்கம் இல்லை."
  },
  {
    "குறள் எண்": 10,
    "குறள்": "அருளல்லது அறம் இல்லை; இயலல்லது \nஇல்லை உயிர்க்கு உறுதி.",
    "விளக்கம்": "அருளின்றி அறம் இல்லை; இயல்பான வாழ்வின்றி உயிர்க்கு நிலை இல்லை."
  }
];

const AdminHomeScreen = () => {
    const thirukkural = thirukkuralData[Math.floor(Math.random() * thirukkuralData.length)];
  const kuralLines = thirukkural['குறள்'].split('\n');
  return (
    <ScrollView style={styles.container}>
            <Profile />

      <View style={styles.thirukkuralContainer}>
        <Text style={styles.thirukkuralTitle}>Tirukkural of the Day (குறள்)</Text>
        <View>
          <Text style={styles.thirukkuralLine}>{kuralLines[0]}</Text>
          <Text style={styles.thirukkuralLine}>{kuralLines[1]}</Text>
          <Text style={styles.thirukkuralExplanationTitle}>விளக்கம் (Explanation):</Text>
          <Text style={styles.thirukkuralExplanation}>{thirukkural['விளக்கம்']}</Text>
        </View>
      </View>

      <View style={styles.countersContainer}>
        <CounterBox 
          icon="account-balance-wallet" 
          title="This Month's Income" 
          symbol="₹"
          count="1,25,000" 
          colors={['#ff9a9e', '#fad0c4']} 
          containerStyle={styles.fullWidthCounter} 
        />
        <View style={styles.rowContainer}>
          <CounterBox 
            icon="people" 
            title="Total Students" 
            count="350" 
            colors={['#a1c4fd', '#c2e9fb']} 
            containerStyle={styles.thirdWidthCounter} 
          />
          <CounterBox 
            icon="store" 
            title="Total Branches" 
            count="5" 
            colors={['#84fab0', '#8fd3f4']} 
            containerStyle={styles.thirdWidthCounter} 
          />
          <CounterBox 
            icon="badge" 
            title="Total Franchisee" 
            count="45" 
            colors={['#fbc2eb', '#a6c1ee']} 
            containerStyle={styles.thirdWidthCounter} 
          />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingTop: 40, // Add padding to account for status bar
  },
  thirukkuralContainer: {
    backgroundColor: '#6D28D9',
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 15,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  thirukkuralTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
  },
  thirukkuralLine: {
    fontSize: 16,
    color: '#fff',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 5,
  },
  thirukkuralExplanationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 15,
    marginBottom: 5,
  },
  thirukkuralExplanation: {
    fontSize: 14,
    color: '#E5E7EB',
  },
  thirukkuralError: {
    color: '#FCA5A5',
    textAlign: 'center',
  },
  countersContainer: {
    paddingHorizontal: 5,
    marginTop: 10,
  },
  fullWidthCounter: {
    width: '96%',
    margin: '2%',
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  thirdWidthCounter: {
    width: '30%',
    margin: '1.5%',
  },
});

export default AdminHomeScreen;
