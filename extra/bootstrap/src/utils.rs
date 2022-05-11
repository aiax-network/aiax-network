pub fn file_replace(
    path: &std::path::PathBuf,
    from: &str,
    to: &str,
) {
    let content = std::fs::read_to_string(&path).unwrap();
    let content = content.replace(from, to);
    std::fs::write(&path, content).unwrap();
}
