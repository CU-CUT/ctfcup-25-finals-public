from collections import deque
f = open("states.txt", "r").readlines(1000000000)
last_state = "481"
outp = list("URF5FCWFYJZ2Y55X9LGCXH")

"""
if we use range(0, 22) code will run way too long, but with reversed range we get the answer immediately
it happens because choice(["R", "R", "R", "L", "L", "N"]) was used inside states.txt generation code 
and it can be noticed in states.txt that
there are not too much "L" and "N" characters in comparison to "R" (6k for each and almost 9k for "R")
"""
for last_index in range(21, -1, -1):
    q = deque()
    q.appendleft([last_state, last_index, outp, 154])

    reverse_table = {}
    for state in f:
        current_state = state.split()
        if not reverse_table.get(current_state[4]):
            reverse_table[current_state[4]] = []
        reverse_table[current_state[4]].append([current_state[0], current_state[1], current_state[2], current_state[3]])

    while q:
        current_state = q.popleft()
        all_previous_candidates = reverse_table[current_state[0]]
        if current_state[3] == 0:
            if current_state[1] == 0:
                if current_state[0] == '0':
                    print(''.join(current_state[2]))
                else:
                    continue
            else:
                continue

        if current_state[3] < 22:
            if current_state[1] > current_state[3] + 1:
                continue

        for previous_candidate in all_previous_candidates:
            if previous_candidate[3] == "N":
                if previous_candidate[2] == current_state[2][current_state[1]]:
                    a = current_state[2][current_state[1]]
                    current_state[2][current_state[1]] = previous_candidate[1]
                    q.append([previous_candidate[0], current_state[1], [i for i in current_state[2]], current_state[3] - 1])
                    current_state[2][current_state[1]] = a
            elif previous_candidate[3] == "R":
                if previous_candidate[2] == current_state[2][max(0, current_state[1] - 1)]:
                    a = current_state[2][max(0, current_state[1] - 1)]
                    current_state[2][max(0, current_state[1] - 1)] = previous_candidate[1]
                    q.append([previous_candidate[0], max(0, current_state[1] - 1), [i for i in current_state[2]], current_state[3] - 1])
                    current_state[2][max(0, current_state[1] - 1)] = a
                if current_state[1] == 21 and previous_candidate[2] == current_state[2][21]:
                    a = current_state[2][21]
                    current_state[2][21] = previous_candidate[1]
                    q.append([previous_candidate[0], 21, [i for i in current_state[2]], current_state[3] - 1])
                    current_state[2][21] = a
            elif previous_candidate[3] == "L":
                if previous_candidate[2] == current_state[2][min(21, current_state[1] + 1)]:
                    a = current_state[2][min(21, current_state[1] + 1)]
                    current_state[2][min(21, current_state[1] + 1)] = previous_candidate[1]
                    q.append([previous_candidate[0], min(21, current_state[1] + 1), [i for i in current_state[2]], current_state[3] - 1])
                    current_state[2][min(21, current_state[1] + 1)] = a
                if current_state[1] == 0 and previous_candidate[2] == current_state[2][0]:
                    a = current_state[2][0]
                    current_state[2][0] = previous_candidate[1]
                    q.append([previous_candidate[0], 0, [i for i in current_state[2]], current_state[3] - 1])
                    current_state[2][0] = a

# N077H47C0M6L1C473DHUHH
