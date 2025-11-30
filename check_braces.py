
def check_braces(filename):
    with open(filename, 'r') as f:
        lines = f.readlines()

    stack = []
    for i, line in enumerate(lines):
        for j, char in enumerate(line):
            if char == '{':
                stack.append((i + 1, j + 1))
            elif char == '}':
                if not stack:
                    print(f"Unexpected closing brace at {i+1}:{j+1}")
                    return
                stack.pop()

    if stack:
        print(f"Missing {len(stack)} closing braces.")
        print(f"Last unclosed brace at: {stack[-1]}")
    else:
        print("Braces are balanced.")

check_braces('App.tsx')
