import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  fullScreen: {
    top: "0%",
    left: "0%",
    width: "100%",
    height: "100%",
    position: "absolute"
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold'
  }
});

export default styles;