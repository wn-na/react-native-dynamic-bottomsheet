import React, { useEffect, useLayoutEffect, useState } from "react";
import { BackHandler, Dimensions, Keyboard, KeyboardAvoidingView, TouchableWithoutFeedback, View } from "react-native";
import { PanGestureHandler } from "react-native-gesture-handler";
import Animated, {
	Extrapolation,
	interpolate,
	runOnJS,
	useAnimatedGestureHandler,
	useAnimatedStyle,
	useSharedValue,
	withTiming
} from "react-native-reanimated";

const DynamicBottomSheet = ({
	navigation,
	snapPoint = [500, 600],
	children,
	backDropClose,
	containerStyle = { flex: 1, backgroundColor: "white" },
	handlerStyle = { backgroundColor: "grey", width: 48, borderRadius: 20, padding: 4 },
	handlerBackgroundStyle = {
		padding: 8,
		width: "100%",
		alignItems: "center",
		backgroundColor: "white",
		borderTopLeftRadius: 18,
		borderTopRightRadius: 18
	}
}: {
	snapPoint: (number | string)[];
	navigation?: any;
	children?: any;
	backDropClose?: boolean;
	containerStyle?: any;
	handlerStyle?: any;
	handlerBackgroundStyle?: any;
}) => {
	const [index, setIndex] = useState(0);
	const [keyboardHeight, setKeyboardHeight] = useState(0);
	const screenHeight = Dimensions.get("window").height;
	const [snapPoints, setPoints] = useState<number[]>([]);
	const getSnapPoint = (list: (number | string)[]) =>
		list?.map((x) => (typeof x === "number" ? x : (screenHeight * +x.split("%")[0]) / 100));
	useEffect(() => {
		setPoints(getSnapPoint(snapPoint));
	}, [snapPoint]);

	const panY = useSharedValue(0);

	const resetBottomSheet = (num: number, list?: number[]) => {
		panY.value = withTiming((list ?? snapPoints)[num], { duration: 300 }, (fin) => {
			if (fin) {
				runOnJS(setIndex)(num);
			}
		});
	};
	const closeBottomSheet = () => {
		panY.value = withTiming(0, { duration: 300 }, (finished) => {
			if (finished) {
				runOnJS(navigation.pop)();
			}
		});
	};

	const eventHandler = useAnimatedGestureHandler({
		onStart: (event, context, isCanceld) => {
			console.log("start", event, context, isCanceld);
			const a = screenHeight - event.absoluteY - keyboardHeight;
			panY.value = screenHeight < a ? screenHeight : a;
		},
		onActive: (event, context, isCanceld) => {
			const a = screenHeight - event.absoluteY - keyboardHeight;
			panY.value = screenHeight < a ? screenHeight : a;
		},
		onFinish: (event, context, isCanceld) => {
			console.log("onFinish", event, context, isCanceld, screenHeight);
			const a = screenHeight - event.absoluteY - keyboardHeight;
			let q = 0;
			if ((event.velocityY > 0 && event.velocityY >= screenHeight) || a < (snapPoints[0] / 3) * 2) {
				runOnJS(closeBottomSheet)();
			} else {
				if (a < snapPoints[0]) {
					runOnJS(setIndex)(0);
					q = 0;
				} else if (a > snapPoints[snapPoints.length - 1]) {
					runOnJS(setIndex)(snapPoints.length - 1);
					q = snapPoints.length - 1;
				} else {
					for (let i = 1; i < snapPoints.length; i++) {
						const mid = snapPoints[i - 1] + (snapPoints[i] - snapPoints[i - 1]) / 2;
						if (snapPoints[i - 1] <= a && a <= mid) {
							runOnJS(setIndex)(i - 1);
							q = i - 1;
							break;
						} else if (mid <= a && a <= snapPoints[i]) {
							runOnJS(setIndex)(i);
							q = i;
							break;
						}
					}
				}
				runOnJS(resetBottomSheet)(q);
			}
		}
	});

	const closeModal = () => {
		closeBottomSheet();
	};

	useEffect(() => {
		if (keyboardHeight == 0) {
			if (panY.value != snapPoints[index]) {
				panY.value = snapPoints[index];
			}
		} else {
			console.log("q", index, snapPoints[index ?? 0], keyboardHeight);
			if (snapPoints[index ?? 0] + keyboardHeight > screenHeight) {
				const q = snapPoints[index ?? 0] - keyboardHeight;
				panY.value = q;
			}
		}
	}, [keyboardHeight]);

	useLayoutEffect(() => {
		navigation.setOptions({
			headerShown: false,
			presentation: "transparentModal",
			animation: "none"
		});
	}, [navigation]);
	useEffect(() => {
		console.log("nidex", index);
	}, [index]);
	useEffect(() => {
		Keyboard.dismiss();
		setPoints(getSnapPoint(snapPoint));
		resetBottomSheet(0, getSnapPoint(snapPoint));
		const a = BackHandler.addEventListener("hardwareBackPress", () => {
			if (backDropClose) {
				closeBottomSheet();
			}
			return true;
		});
		const b = Keyboard.addListener("keyboardDidShow", (event) => {
			setKeyboardHeight(event.endCoordinates.height);
		});
		const c = Keyboard.addListener("keyboardDidHide", (event) => {
			runOnJS(setKeyboardHeight)(0);
		});
		return () => {
			a.remove();
			b.remove();
			c.remove();
		};
	}, []);

	const animatedStyle = useAnimatedStyle(() => {
		const 투명도 = interpolate(panY.value, [0, screenHeight - keyboardHeight], [1, 0.1], {
			extrapolateRight: Extrapolation.CLAMP
		});
		return {
			backgroundColor: `rgba(0,0,0, ${1 - 투명도})`,
			position: "absolute",
			width: "100%",
			height: "100%",
			top: 0,
			left: 0
		};
	});

	const bottomSheetStyle = useAnimatedStyle(() => {
		return {
			height: panY.value
		};
	});

	return (
		<Animated.View style={animatedStyle}>
			<View
				style={{
					flex: 1,
					justifyContent: "flex-end"
				}}
			>
				<TouchableWithoutFeedback onPress={backDropClose ? closeModal : () => {}}>
					<View
						style={{
							flex: 1
						}}
					/>
				</TouchableWithoutFeedback>
				<KeyboardAvoidingView>
					<Animated.View style={bottomSheetStyle}>
						<View style={{ justifyContent: "center", alignItems: "center" }}>
							<PanGestureHandler onGestureEvent={eventHandler}>
								<Animated.View style={handlerBackgroundStyle}>
									<Animated.View style={handlerStyle} />
								</Animated.View>
							</PanGestureHandler>
						</View>
						<View style={containerStyle}>{children}</View>
					</Animated.View>
				</KeyboardAvoidingView>
			</View>
		</Animated.View>
	);
};

export { DynamicBottomSheet };
