export const SiemensChar = (dist_char_angle, X, R, a1_angle = 30, a2_angle = 22, inclination_angle = 0) => {
    // Convert angles to radians
    a1_angle = a1_angle * Math.PI / 180;
    a2_angle = a2_angle * Math.PI / 180;
    dist_char_angle = dist_char_angle * Math.PI / 180;
    inclination_angle = inclination_angle * Math.PI / 180;

    // Initialize data points
    const data_points = {
        R: [0],
        X: [0]
    };

    // Second coordinate
    let r = -X * Math.tan(a1_angle);
    data_points.R.push(r);
    data_points.X.push(X);

    // Third coordinate
    if (inclination_angle === 0) {
        r = X / Math.tan(dist_char_angle) + R;
    } else {
        r = X / Math.tan(dist_char_angle);
    }
    data_points.R.push(r);
    data_points.X.push(X);

    // Fourth coordinate
    let x;
    if (inclination_angle === 0) {
        r = R * (1 - Math.tan(a2_angle) / (Math.tan(a2_angle) + Math.tan(dist_char_angle)));
        x = -R * (Math.tan(a2_angle) * Math.tan(dist_char_angle)) / (Math.tan(a2_angle) + Math.tan(dist_char_angle));
    } else {
        r = X / Math.tan(dist_char_angle) + R * (
            1 - Math.tan(inclination_angle) / (Math.tan(inclination_angle) + Math.tan(dist_char_angle)));
        x = X - R * (Math.tan(inclination_angle) * Math.tan(dist_char_angle)) / (
            Math.tan(inclination_angle) + Math.tan(dist_char_angle));
    }
    data_points.R.push(r);
    data_points.X.push(x);

    // Fifth coordinate
    if (inclination_angle !== 0) {
        r = R * (1 - Math.tan(a2_angle) / (Math.tan(a2_angle) + Math.tan(dist_char_angle)));
        x = -R * (Math.tan(a2_angle) * Math.tan(dist_char_angle)) / (Math.tan(a2_angle) + Math.tan(dist_char_angle));
        data_points.R.push(r);
        data_points.X.push(x);
    }

    return data_points.R.map((r, i) => ({ R: r, X: data_points.X[i] }));
};