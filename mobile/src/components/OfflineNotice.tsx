import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

type Props = { message: string };

export function OfflineNotice({ message }: Props) {
  return (
    <View style={styles.box}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: "#FFF7ED",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  text: { color: "#9A3412", fontWeight: "600", fontSize: 13 },
});
