#include "Parser/parser.h"
#include "Globals/string.h"

/* NOTE: plain brace initializers (not `(Token){ ..., .value = NIL }`) so
 * these tables are valid constant initializers on every C compiler. */


Token LOGICAL_OPERATORS[] = {
    { .tt = TT_RAND, .value = { .nan = QNaN } },
    { .tt = TT_ROR, .value = { .nan = QNaN } },
    { .tt = TT_AND, .value = { .nan = QNaN } },
    { .tt = TT_OR, .value = { .nan = QNaN } },
    { .tt = TT_BAND, .value = { .nan = QNaN } },
    { .tt = TT_BOR, .value = { .nan = QNaN } },
    { .tt = TT_BXOR, .value = { .nan = QNaN } },
};

Token COMP_OPERATORS[] = {
    { .tt = TT_EEQ, .value = { .nan = QNaN } },
    { .tt = TT_NEQ, .value = { .nan = QNaN } },
    { .tt = TT_LT, .value = { .nan = QNaN } },
    { .tt = TT_GT, .value = { .nan = QNaN } },
    { .tt = TT_LTEQ, .value = { .nan = QNaN } },
    { .tt = TT_GTEQ, .value = { .nan = QNaN } }
};

Token ARITHMETIC_OPERATORS[] = {
    { .tt = TT_PLUS, .value = { .nan = QNaN } },
    { .tt = TT_MINUS, .value = { .nan = QNaN } },
    { .tt = TT_CONCAT, .value = { .nan = QNaN } }
};

Token TERM_OPERATORS[] = {
    { .tt = TT_MUL, .value = { .nan = QNaN } },
    { .tt = TT_DIV, .value = { .nan = QNaN } },
    { .tt = TT_IDIV, .value = { .nan = QNaN } },
    { .tt = TT_MOD, .value = { .nan = QNaN } }
};

Token FACTOR_OPERATORS[] = {
    { .tt = TT_PLUS, .value = { .nan = QNaN } },
    { .tt = TT_MINUS, .value = { .nan = QNaN } }
};

Token POWER_OPERATORS[] = {
    { .tt = TT_POW, .value = { .nan = QNaN } }
};


size_t LOGICAL_OPERATORS_SIZE = sizeof(LOGICAL_OPERATORS) / sizeof(LOGICAL_OPERATORS[0]);
size_t COMP_OPERATORS_SIZE = sizeof(COMP_OPERATORS) / sizeof(COMP_OPERATORS[0]);
size_t ARITHMETIC_OPERATORS_SIZE = sizeof(ARITHMETIC_OPERATORS) / sizeof(ARITHMETIC_OPERATORS[0]);
size_t TERM_OPERATORS_SIZE = sizeof(TERM_OPERATORS) / sizeof(TERM_OPERATORS[0]);
size_t FACTOR_OPERATORS_SIZE = sizeof(FACTOR_OPERATORS) / sizeof(FACTOR_OPERATORS[0]);
size_t POWER_OPERATORS_SIZE = sizeof(POWER_OPERATORS) / sizeof(POWER_OPERATORS[0]);
void init_operators() {
    LOGICAL_OPERATORS[5].value = make_fstring("and");
    LOGICAL_OPERATORS[6].value = make_fstring("or");
}