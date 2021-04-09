# :has() style Invalidation prototyping details

CL: <a href="https://chromium-review.googlesource.com/c/chromium/src/+/2725907" target="_blank">https://chromium-review.googlesource.com/c/chromium/src/+/2725907</a>

Binary: <a href="https://cloud.igalia.com/s/roLob25tsTzdKTa" target="_blink">https://cloud.igalia.com/s/roLob25tsTzdKTa</a>

## 1. Diagrams

### 1.1. Class Diagram

![Class Diagram](diagrams/class_diagram.png)

### 1.2. Sequence Diagram

#### 1.2.1. Collect features from selector

##### 1.2.1.1. Add features from \<complex-selector>

![Add features from complex selector](diagrams/add_features_from_complex_selector.png)

##### 1.2.1.2. Extract features from \<complex-selector>

![Extract features from complex selector](diagrams/extract_features_from_complex_selector.png)

##### 1.2.1.3. Ensure simple feature

![Ensure simple feature](diagrams/ensure_simple_feature.png)

##### 1.2.1.4. Ensure compound feature

![Ensure compound feature](diagrams/ensure_compound_feature.png)

##### 1.2.1.5. Extract argument features from downward / upward selectors

![Extract argument features from downward selectors](diagrams/extract_argument_features_from_downward_selectors.png)
![Extract argument features from upward selectors](diagrams/extract_argument_features_from_upward_selectors.png)

##### 1.2.1.6. Initialize / Collect / Finalize of downward invalidation

![Initialize / Collect / Finalize of downward invalidation](diagrams/initialize_collect_finalize_of_downward_invalidation.png)

##### 1.2.1.7. Initialize / Collect / Finalize of upward invalidation

![Initialize / Collect / Finalize of upward invalidation](diagrams/initialize_collect_finalize_of_upward_invalidation.png)

##### 1.2.1.8. Index features

![Index features](diagrams/index_features.png)


#### 1.2.2. Find target elements of change and invalidate those

##### 1.2.2.1. Invalidate for Id changed

![Invalidate has subject elements for id changed](diagrams/invalidate_has_subject_elements_for_id_changed.png)

##### 1.2.2.2. Check upward subtree of changed element

##### 1.2.2.3. InvalidateDownward
