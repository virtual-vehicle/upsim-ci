# Rotational speed range

Justification of design specifications #spec_integration_rotational_velocity_range:

The rotational speed range is tested by using very high the positive and negative voltage values, without applying a load.

The required voltage for reaching the rotational velocity range has been calculated according to the formula:
U_bat = (d*w + M_L + w * c_mot²/R) * R/c_mot

Therefore, more than 80 V is required to reach 2000 rad/s.

Assumption: All values in-between the boundaries are less critical for the verification of the design.